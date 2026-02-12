#!/usr/bin/env python3
"""
GitHub Complete Commit History Finder
Walks the entire commit ancestry and captures the full lineage.
Outputs two CSVs: one with short SHAs (7 char) and one with full SHAs.
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
OUTPUT_CSV_SHORT = "output_short.csv"
OUTPUT_CSV_FULL = "output_full.csv"

# GitHub API base URL
API_BASE = "https://api.github.com"

# Headers for GitHub API requests
HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


def get_commit_info(repo: str, sha: str) -> dict:
    """
    Get full commit information including parents.
    
    Args:
        repo: Repository in format "owner/repo"
        sha: Commit SHA
    
    Returns:
        Dict with commit info including parents list
    """
    url = f"{API_BASE}/repos/{repo}/commits/{sha}"
    
    try:
        response = requests.get(url, headers=HEADERS, verify=False)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  ERROR: Failed to get commit {sha[:7]}: {e}")
        return None


def walk_commit_history(repo: str, start_sha: str) -> list:
    """
    Walk the complete commit history from start_sha back to the beginning.
    Captures ALL commits, marking merge commits and deviations.
    
    Args:
        repo: Repository in format "owner/repo"
        start_sha: Starting commit SHA
    
    Returns:
        List of dicts with commit info: {sha, parent_count, is_merge, message}
    """
    history = []
    visited = set()  # Prevent infinite loops
    queue = [start_sha]  # Use queue to handle merge commits
    
    print(f"  Walking commit history from {start_sha[:7]}...")
    step = 0
    
    while queue:
        current_sha = queue.pop(0)
        
        # Skip if already visited
        if current_sha in visited:
            continue
        
        visited.add(current_sha)
        step += 1
        
        if step % 10 == 0:
            print(f"  ... processed {step} commits")
        
        # Get commit info
        commit_info = get_commit_info(repo, current_sha)
        if not commit_info:
            break
        
        parents = commit_info.get('parents', [])
        parent_count = len(parents)
        message = commit_info.get('commit', {}).get('message', '').split('\n')[0][:50]  # First line, truncated
        
        # Determine commit type
        is_merge = parent_count >= 2
        commit_type = "MERGE" if is_merge else "regular"
        
        # Record this commit
        history.append({
            'sha': current_sha,
            'parent_count': parent_count,
            'is_merge': is_merge,
            'message': message,
            'parents': [p['sha'] for p in parents]
        })
        
        # Add all parents to queue (follow the full history tree)
        for parent in parents:
            parent_sha = parent['sha']
            if parent_sha not in visited:
                queue.append(parent_sha)
    
    print(f"  -> Walked {len(history)} commits total")
    return history


def format_history_path(history: list, use_short: bool = True) -> str:
    """
    Format commit history as a readable path string.
    
    Args:
        history: List of commit dicts from walk_commit_history
        use_short: If True, use 7-char SHAs, otherwise full SHAs
    
    Returns:
        Formatted string like "abc123 -> def456 (MERGE: 2 parents) -> ghi789"
    """
    path_parts = []
    
    for commit in history:
        sha = commit['sha'][:7] if use_short else commit['sha']
        
        if commit['is_merge']:
            part = f"{sha} (MERGE: {commit['parent_count']} parents)"
        else:
            part = sha
        
        path_parts.append(part)
    
    return " -> ".join(path_parts)


def process_csv(input_file: str, output_short: str, output_full: str):
    """
    Process the input CSV and generate two output files with full commit history.
    
    Args:
        input_file: Path to input CSV
        output_short: Path to output CSV with short SHAs
        output_full: Path to output CSV with full SHAs
    """
    results_short = []
    results_full = []
    
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
        
        # Walk the complete history
        history = walk_commit_history(repo, sha)
        
        if not history:
            print(f"  WARNING: No history found\n")
            results_short.append({
                'repo': repo,
                'current_SHA': sha[:7],
                'commit_count': 0,
                'merge_count': 0,
                'history_path': 'ERROR: Could not retrieve history'
            })
            results_full.append({
                'repo': repo,
                'current_SHA': sha,
                'commit_count': 0,
                'merge_count': 0,
                'history_path': 'ERROR: Could not retrieve history'
            })
            continue
        
        # Count merges
        merge_count = sum(1 for c in history if c['is_merge'])
        
        # Format paths
        path_short = format_history_path(history, use_short=True)
        path_full = format_history_path(history, use_short=False)
        
        # Store results
        results_short.append({
            'repo': repo,
            'current_SHA': sha[:7],
            'commit_count': len(history),
            'merge_count': merge_count,
            'history_path': path_short
        })
        
        results_full.append({
            'repo': repo,
            'current_SHA': sha,
            'commit_count': len(history),
            'merge_count': merge_count,
            'history_path': path_full
        })
        
        print(f"  -> {len(history)} commits, {merge_count} merges")
        print(f"  -> Path preview: {path_short[:100]}...\n")
    
    # Write output CSVs
    fieldnames = ['repo', 'current_SHA', 'commit_count', 'merge_count', 'history_path']
    
    with open(output_short, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results_short)
    
    with open(output_full, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results_full)
    
    print(f"✓ Short SHA results written to {output_short}")
    print(f"✓ Full SHA results written to {output_full}")


def main():
    """Main entry point."""
    if GITHUB_TOKEN == "YOUR_GITHUB_PAT_TOKEN_HERE":
        print("ERROR: Please set your GitHub Personal Access Token in the script!")
        print("Edit GITHUB_TOKEN at the top of the script.")
        sys.exit(1)
    
    print("=" * 70)
    print("GitHub Complete Commit History Finder")
    print("=" * 70)
    print(f"Input:        {INPUT_CSV}")
    print(f"Output Short: {OUTPUT_CSV_SHORT}")
    print(f"Output Full:  {OUTPUT_CSV_FULL}")
    print("=" * 70)
    
    process_csv(INPUT_CSV, OUTPUT_CSV_SHORT, OUTPUT_CSV_FULL)


if __name__ == "__main__":
    main()
