# Security Policy

## Supported Versions
Only the latest commit on `main` receives security updates. There are no tagged releases yet.

## Reporting a Vulnerability
Do not file public GitHub issues for security vulnerabilities.

Open a private security advisory: https://github.com/sanikeit/talaro/security/advisories/new
Or email: security@[YOUR-DOMAIN-PLACEHOLDER]
(Replace the email placeholder with a real address before making the repo public.)

Include:
- Description of the issue
- Steps to reproduce
- Affected endpoint or module
- Any suggested fix

## Response Expectations
- Acknowledgment within 72 hours
- Initial assessment within 7 days
- Fix timeline depends on severity

## Scope
In scope:
- Invite gate and seller creation workflow
- Referral quota and reputation logic
- Public read API (/public/*)
- Authentication and session handling

Out of scope:
- Vulnerabilities in @mercurjs/* or @medusajs/* framework packages (report upstream)
- Vulnerabilities in Medusa or Next.js themselves (report upstream)
- Social engineering

## Disclosure Policy
We follow coordinated disclosure. We will credit reporters in the advisory once a fix is released, unless you prefer to remain anonymous.
