#!/usr/bin/env python3
"""
GitHub Branch Ancestry Finder
Reads a CSV of repos and commit SHAs, finds which branches contain them
and identifies the parent branch each diverged from.
"""

import csv
import requests
import sys
from typing import Dict, List, Optional, Tuple

# CONFIGURATION
GITHUB_TOKEN = "YOUR_GITHUB_PAT_TOKEN_HERE"
INPUT_CSV = "input.csv"
OUTPUT_CSV = "output.csv"

# GitHub API base URL
API_BASE = "https://api.github.com"

# Headers for GitHub API requests
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
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
        response = requests.get(url, headers=HEADERS)
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
            response = requests.get(url, headers=HEADERS, params={"per_page": 100})
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
    1. Get commit's parent SHA(s)
    2. Find which major branches contain the parent
    3. Return the most likely parent branch
    
    Args:
        repo: Repository in format "owner/repo"
        current_sha: The commit SHA we're analyzing
        current_branches: Branches where current_sha is HEAD
    
    Returns:
        Tuple of (branch_name, sha) or (None, parent_sha)
    """
    # Get commit details to find parent(s)
    commit_info = get_commit_info(repo, current_sha)
    if not commit_info:
        return None, None
    
    parents = commit_info.get('parents', [])
    if not parents:
        # No parents means this is the initial commit
        return None, None
    
    # Get the first parent (main line of development)
    parent_sha = parents[0]['sha']
    
    # Get all branches to check which contain the parent
    all_branches = get_all_branches(repo)
    if not all_branches:
        return None, parent_sha
    
    # Common parent branch patterns to prioritize
    priority_branches = ['main', 'master', 'develop', 'development', 'staging', 'production']
    
    # Find branches that contain the parent SHA but not in current_branches
    candidate_branches = []
    
    for branch in all_branches:
        branch_name = branch['name']
        
        # Skip if this is one of the current branches
        if branch_name in current_branches:
            continue
        
        # Compare the branch with our current SHA to see if parent is in that branch
        comparison = compare_commits(repo, branch_name, current_sha)
        if not comparison:
            continue
        
        # If ahead_by > 0, it means current_sha has commits not in branch_name
        # If behind_by >= 0, it means branch_name has commits leading to current_sha
        # We want branches where the parent is an ancestor
        
        # Check if this branch contains the parent
        # We do this by seeing if merge_base_commit matches or is close to parent
        if comparison.get('merge_base_commit', {}).get('sha') == parent_sha:
            candidate_branches.append(branch_name)
        elif comparison.get('status') == 'diverged' and comparison.get('behind_by', 0) > 0:
            candidate_branches.append(branch_name)
    
    # Prioritize common branch names
    for priority_branch in priority_branches:
        if priority_branch in candidate_branches:
            return priority_branch, parent_sha
    
    # Return the first candidate if any
    if candidate_branches:
        return candidate_branches[0], parent_sha
    
    # If no branch found, just return the parent SHA
    return None, parent_sha


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
            diverged_from = f"{diverged_branch} ({diverged_sha[:7]})"
        elif diverged_sha:
            diverged_from = diverged_sha[:7]
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
