#!/usr/bin/env python3
"""Publish approved ticket bodies. Never commit, push, or publish Pages."""
import json
from pathlib import Path
import subprocess
import tempfile

REPO = 'seatea-dev/effect-lab'
ROOT = Path(__file__).resolve().parent


def gh(*args):
    result = subprocess.run(['gh', *args], text=True, capture_output=True)
    if result.returncode:
        raise SystemExit(result.stderr.strip() or 'GitHub command failed.')
    return result.stdout.strip()


def main():
    login = gh('api', 'user', '--jq', '.login')
    repo = json.loads(gh('repo', 'view', REPO, '--json', 'nameWithOwner,url,visibility'))
    if repo['nameWithOwner'] != REPO or repo['visibility'] != 'PRIVATE':
        raise SystemExit('Stopped: the target repository must exist and remain private.')
    existing = json.loads(gh('issue', 'list', '--repo', REPO, '--state', 'all',
                             '--limit', '1000', '--json', 'number,title,url,body'))
    if len(existing) >= 1000:
        raise SystemExit('Stopped: issue inventory reached its limit; verify it manually.')
    tickets = json.loads((ROOT / 'tickets.json').read_text())
    links = {}
    print(f'Authenticated as {login}. Verified private repository {repo["url"]}.')
    with tempfile.TemporaryDirectory(prefix='effect-lab-issues-') as temp:
        for ticket in tickets:
            body = (ROOT / ticket['body']).read_text()
            dependency_text = ', '.join(links[str(n)]['url'] for n in ticket['blockers'])
            if not dependency_text:
                dependency_text = 'None. Implementation still requires ticket-plan approval.'
            body = '\n'.join(
                '**Blocked by:** ' + dependency_text if line.startswith('**Blocked by:**') else line
                for line in body.splitlines()) + '\n'
            matches = [issue for issue in existing if issue['title'] == ticket['title']]
            if len(matches) > 1:
                raise SystemExit(f'Stopped: duplicate title {ticket["title"]}. No issues overwritten.')
            if matches:
                issue = matches[0]
                if issue['body'].strip() != body.strip():
                    raise SystemExit(f'Stopped: existing issue differs: {issue["url"]}. No issues overwritten.')
            else:
                body_file = Path(temp) / f'{ticket["number"]:02d}.md'
                body_file.write_text(body)
                url = gh('issue', 'create', '--repo', REPO, '--title', ticket['title'],
                         '--body-file', str(body_file))
                issue = json.loads(gh('issue', 'view', url, '--json', 'number,title,url,body'))
                if issue['title'] != ticket['title'] or issue['body'].strip() != body.strip():
                    raise SystemExit(f'Stopped: verify the created issue manually: {url}')
            links[str(ticket['number'])] = {'number': issue['number'], 'url': issue['url']}
            (ROOT / 'issue-links.json').write_text(json.dumps(links, indent=2) + '\n')
            print(f'Ticket {ticket["number"]}: {issue["url"]}')
    print('Verified all 10 issues. No commits, pushes, PRs, merges, or deployments performed.')


if __name__ == '__main__':
    main()
