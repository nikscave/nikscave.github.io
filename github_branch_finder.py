#!/usr/bin/env python3
"""
GitHub Branch Ancestry Finder
Reads a CSV of repos and commit SHAs, finds which branches contain them
and identifies the parent branch each diverged from.
"""

import csv
import requests
import sys
import urllib3
from typing import Dict, List, Optional, Tuple

# Disable SSL warnings (for corporate proxies with self-signed certs)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# CONFIGURATION
GITHUB_TOKEN = "YOUR_GITHUB_PAT_TOKEN_HERE"
INPUT_CSV = "input.csv"
OUTPUT_CSV = "output.csv"

# GitHub API base URL
API_BASE = "https://api.github.com"

# Headers for GitHub API requests
HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


def get_branches_where_head(repo: str, sha: str) -> List[str]:
    """
    Find all branches where the given SHA is the HEAD commit.
    
    Args:
        repo: Repository in format "owner/repo"
        sha: Commit SHA
    
    Returns:
        List of branch names
    """
    url = f"{API_BASE}/repos/{repo}/commits/{sha}/branches-where-head"
    
    try:
        response = requests.get(url, headers=HEADERS, verify=False)
        response.raise_for_status()
        branches = response.json()
        return [branch['name'] for branch in branches]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching branches for {repo}/{sha}: {e}")
        return []


def get_all_branches(repo: str) -> List[Dict]:
    """
    Get all branches in a repository.
    
    Args:
        repo: Repository in format "owner/repo"
    
    Returns:
        List of branch objects with name and commit info
    """
    url = f"{API_BASE}/repos/{repo}/branches"
    branches = []
    
    try:
        # Handle pagination
        while url:
            response = requests.get(url, headers=HEADERS, params={"per_page": 100}, verify=False)
            response.raise_for_status()
            branches.extend(response.json())
            
            # Check for next page
            url = response.links.get('next', {}).get('url')
        
        return branches
    except requests.exceptions.RequestException as e:
        print(f"Error fetching branches for {repo}: {e}")
        return []


def get_commit_info(repo: str, sha: str) -> Optional[Dict]:
    """
    Get detailed information about a commit.
    
    Args:
        repo: Repository in format "owner/repo"
        sha: Commit SHA
    
    Returns:
        Commit information dict or None
    """
    url = f"{API_BASE}/repos/{repo}/commits/{sha}"
    
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching commit {repo}/{sha}: {e}")
        return None


def compare_commits(repo: str, base: str, head: str) -> Optional[Dict]:
    """
    Compare two commits to find their relationship.
    
    Args:
        repo: Repository in format "owner/repo"
        base: Base commit/branch
        head: Head commit/branch
    
    Returns:
        Comparison information or None
    """
    url = f"{API_BASE}/repos/{repo}/compare/{base}...{head}"
    
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error comparing {base}...{head} in {repo}: {e}")
        return None


def find_divergence_point(repo: str, current_sha: str, current_branches: List[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Find the branch/commit that the current SHA diverged from.
    
    Strategy:
    1. Walk back the commit history from current_sha
    2. Find the first merge commit (2 parents)
    3. The second parent is the branch that was merged (divergence point)
    4. Find which branch contains that parent SHA
    
    Args:
        repo: Repository in format "owner/repo"
        current_sha: The commit SHA we're analyzing
        current_branches: Branches where current_sha is HEAD
    
    Returns:
        Tuple of (branch_name, sha) or (None, parent_sha)
    """
    print(f"    Walking commit history to find merge point...")
    
    # Walk back up to 50 commits to find a merge
    current = current_sha
    for i in range(50):
        commit_info = get_commit_info(repo, current)
        if not commit_info:
            return None, None
        
        parents = commit_info.get('parents', [])
        
        if len(parents) == 0:
            # Initial commit, no parent
            print(f"    Reached initial commit")
            return None, None
        
        elif len(parents) == 2:
            # Merge commit! Second parent is the merged branch
            parent_0_sha = parents[0]['sha']  # Branch merged INTO
            parent_1_sha = parents[1]['sha']  # Branch merged FROM (divergence!)
            
            print(f"    Found merge commit at {current[:7]}")
            print(f"    Parent 0 (merged into): {parent_0_sha[:7]}")
            print(f"    Parent 1 (merged from): {parent_1_sha[:7]}")
            
            # Find which branch contains parent_1 (the source branch)
            branch_name = find_branch_containing_commit(repo, parent_1_sha, current_branches)
            
            if branch_name:
                return branch_name, parent_1_sha
            else:
                return None, parent_1_sha
        
        elif len(parents) == 1:
            # Regular commit, keep walking back
            current = parents[0]['sha']
        
        else:
            # Octopus merge (3+ parents) - rare, use second parent
            parent_1_sha = parents[1]['sha']
            branch_name = find_branch_containing_commit(repo, parent_1_sha, current_branches)
            return branch_name, parent_1_sha
    
    print(f"    No merge commit found in last 50 commits")
    return None, None


def find_branch_containing_commit(repo: str, sha: str, exclude_branches: List[str]) -> Optional[str]:
    """
    Find which branch contains a given commit SHA.
    
    Args:
        repo: Repository in format "owner/repo"
        sha: Commit SHA to find
        exclude_branches: Branch names to exclude from search
    
    Returns:
        Branch name or None
    """
    # Priority branches to check first
    priority_branches = ['main', 'master', 'develop', 'development', 'staging', 'production', 'release']
    
    # Get all branches
    all_branches = get_all_branches(repo)
    if not all_branches:
        return None
    
    # Check priority branches first
    for priority in priority_branches:
        for branch in all_branches:
            if branch['name'] == priority and branch['name'] not in exclude_branches:
                # Check if this branch contains the SHA
                if branch_contains_commit(repo, branch['name'], sha):
                    return branch['name']
    
    # Check all other branches
    for branch in all_branches:
        branch_name = branch['name']
        if branch_name not in exclude_branches and branch_name not in priority_branches:
            if branch_contains_commit(repo, branch_name, sha):
                return branch_name
    
    return None


def branch_contains_commit(repo: str, branch: str, sha: str) -> bool:
    """
    Check if a branch contains a specific commit.
    
    Args:
        repo: Repository in format "owner/repo"
        branch: Branch name
        sha: Commit SHA
    
    Returns:
        True if branch contains the commit
    """
    # Use compare API: if sha is an ancestor of branch, merge_base will be sha
    comparison = compare_commits(repo, sha, branch)
    if not comparison:
        return False
    
    merge_base = comparison.get('merge_base_commit', {}).get('sha', '')
    
    # If merge base equals our SHA, then SHA is an ancestor of branch
    return merge_base == sha


def process_csv(input_file: str, output_file: str):
    """
    Process the input CSV and generate output with branch ancestry info.
    
    Args:
        input_file: Path to input CSV
        output_file: Path to output CSV
    """
    results = []
    
    # Read input CSV
    try:
        with open(input_file, 'r') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except FileNotFoundError:
        print(f"Error: {input_file} not found!")
        sys.exit(1)
    
    # Process each row
    for i, row in enumerate(rows, 1):
        repo = row.get('repo', '').strip()
        sha = row.get('SHA', '').strip()
        provided_branch = row.get('current branch name', '').strip()
        
        print(f"Processing {i}/{len(rows)}: {repo} @ {sha}")
        
        # Find branches where this SHA is HEAD
        branches_at_head = get_branches_where_head(repo, sha)
        branches_str = ','.join(branches_at_head) if branches_at_head else 'Not found at any branch HEAD'
        
        # Find divergence point
        diverged_branch, diverged_sha = find_divergence_point(repo, sha, branches_at_head)
        
        if diverged_branch:
            diverged_from = f"{diverged_branch} ({diverged_sha})"
        elif diverged_sha:
            diverged_from = diverged_sha
        else:
            diverged_from = "Unknown"
        
        results.append({
            'repo': repo,
            'current_SHA': sha,
            'branches_at_head': branches_str,
            'diverged_from': diverged_from
        })
        
        print(f"  -> Branches at HEAD: {branches_str}")
        print(f"  -> Diverged from: {diverged_from}\n")
    
    # Write output CSV
    with open(output_file, 'w', newline='') as f:
        fieldnames = ['repo', 'current_SHA', 'branches_at_head', 'diverged_from']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"✓ Results written to {output_file}")


def main():
    """Main entry point."""
    if GITHUB_TOKEN == "YOUR_GITHUB_PAT_TOKEN_HERE":
        print("Error: Please set your GitHub Personal Access Token in the script!")
        print("Edit GITHUB_TOKEN at the top of the script.")
        sys.exit(1)
    
    print("GitHub Branch Ancestry Finder")
    print("=" * 50)
    print(f"Input file: {INPUT_CSV}")
    print(f"Output file: {OUTPUT_CSV}")
    print("=" * 50)
    print()
    
    process_csv(INPUT_CSV, OUTPUT_CSV)


if __name__ == "__main__":
    main()
