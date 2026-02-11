#!/usr/bin/env python3
"""
GitHub Branch Ancestry Finder - Simplified
Walks commit history until finding a merge commit (2 parents).
Returns the second parent SHA (the branch that was merged from).
"""

import csv
import requests
import sys
import urllib3

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


def get_commit_parents(repo: str, sha: str) -> list:
    """
    Get parent commit SHAs for a given commit.
    
    Args:
        repo: Repository in format "owner/repo"
        sha: Commit SHA
    
    Returns:
        List of parent SHAs (empty if no parents, 1 for regular commit, 2+ for merge)
    """
    url = f"{API_BASE}/repos/{repo}/commits/{sha}"
    
    try:
        response = requests.get(url, headers=HEADERS, verify=False)
        response.raise_for_status()
        commit_info = response.json()
        parents = commit_info.get('parents', [])
        return [p['sha'] for p in parents]
    except requests.exceptions.RequestException as e:
        print(f"  ERROR: Failed to get commit {sha[:7]}: {e}")
        return []


def find_merge_parent(repo: str, start_sha: str, max_depth: int = 100) -> str:
    """
    Walk back commit history until finding a merge commit (2 parents).
    Return the second parent SHA (the branch merged from).
    
    Args:
        repo: Repository in format "owner/repo"
        start_sha: Starting commit SHA
        max_depth: Maximum commits to walk back
    
    Returns:
        SHA of the parent branch, or "Not found" if no merge in depth limit
    """
    current_sha = start_sha
    
    for i in range(max_depth):
        print(f"  Step {i+1}: Checking {current_sha[:7]}...")
        
        parents = get_commit_parents(repo, current_sha)
        
        if len(parents) == 0:
            print(f"  -> Initial commit (no parents)")
            return "Initial commit"
        
        elif len(parents) == 1:
            # Regular commit, continue walking
            print(f"  -> 1 parent: {parents[0][:7]}, continuing...")
            current_sha = parents[0]
        
        elif len(parents) >= 2:
            # Merge commit found!
            print(f"  -> MERGE COMMIT FOUND!")
            print(f"  -> Parent 0 (merged into): {parents[0][:7]}")
            print(f"  -> Parent 1 (merged from): {parents[1][:7]}")
            return parents[1]  # Return the branch that was merged FROM
    
    print(f"  -> No merge found in {max_depth} commits")
    return "Not found"


def process_csv(input_file: str, output_file: str):
    """
    Process the input CSV and generate output with parent branch SHA.
    
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
        print(f"ERROR: {input_file} not found!")
        sys.exit(1)
    
    print(f"\nProcessing {len(rows)} commits...\n")
    
    # Process each row
    for i, row in enumerate(rows, 1):
        repo = row.get('repo', '').strip()
        sha = row.get('SHA', '').strip()
        
        print(f"[{i}/{len(rows)}] {repo} @ {sha[:7]}")
        
        # Find the parent branch SHA
        parent_sha = find_merge_parent(repo, sha)
        
        results.append({
            'repo': repo,
            'current_SHA': sha,
            'parent_branch_SHA': parent_sha
        })
        
        print(f"  RESULT: {parent_sha}\n")
    
    # Write output CSV
    with open(output_file, 'w', newline='') as f:
        fieldnames = ['repo', 'current_SHA', 'parent_branch_SHA']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"✓ Results written to {output_file}")


def main():
    """Main entry point."""
    if GITHUB_TOKEN == "YOUR_GITHUB_PAT_TOKEN_HERE":
        print("ERROR: Please set your GitHub Personal Access Token in the script!")
        print("Edit GITHUB_TOKEN at the top of the script.")
        sys.exit(1)
    
    print("=" * 60)
    print("GitHub Parent Branch Finder (Simplified)")
    print("=" * 60)
    print(f"Input:  {INPUT_CSV}")
    print(f"Output: {OUTPUT_CSV}")
    print("=" * 60)
    
    process_csv(INPUT_CSV, OUTPUT_CSV)


if __name__ == "__main__":
    main()
