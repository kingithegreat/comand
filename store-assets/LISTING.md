# Play Console Listing Pack — Tactical Command

Everything below is copy-paste ready for the Play Console. Work top to bottom alongside
`PLAY_STORE_GUIDE.md` § Release Night Checklist.

## Store listing

| Field | Value |
|---|---|
| App name | Tactical Command |
| Short description (≤80 chars) | Turn-based tactics. Build a squad, outsmart the enemy. |
| Category | Strategy |
| Tags | Strategy, Board, Turn-based |
| Email (public) | adenkingi9@gmail.com |
| Privacy policy URL | https://gen-lang-client-0969027846.web.app/privacy-policy.html |

**Full description:**

> Command your squad in fast turn-based tactical battles. Pick from 12 unique unit
> archetypes — Sniper, Demoman, Heavy, Medic, Phantom, Vanguard and more — each with
> their own abilities, range profiles and team chemistry combos.
>
> ⚔️ FIGHT YOUR WAY
> • Campaign — story missions with scaling difficulty
> • VS AI — practice skirmishes on your terms
> • Pass & Play — local 2-player on one device
> • Online — battle friends with room codes, or find a match
>
> 🎲 OUTSMART, DON'T OUTGUN
> Use cover, line of sight and overwatch. Toggle Fog of War to hide unseen enemies,
> or play Capture the Flag for a whole different win condition. Squad sizes from 1v1
> duels to 8v8 wars.
>
> 🗺️ A FULL 3D BATTLEFIELD IN YOUR POCKET
> Flip between the classic tactical grid and a fully rendered 3D board — drag to
> orbit, pinch to zoom, tap to command.
>
> Build your formation. Save it. Deploy. Your move, Commander.

## Graphics assets

| Asset | File | Spec |
|---|---|---|
| App icon | auto from AAB (`icon-512.png`) | 512×512 |
| Feature graphic | `public/feature-graphic.png` | 1024×500 |
| Phone screenshots | `store-assets/screenshots/01–05*.png` (06 is a spare) | 1080×1920, 9:16 |

Screenshot order suggestion: 05 (3D battlefield) first — it's the differentiator — then 03, 04, 02, 01.

## Content rating questionnaire (IARC)

Category: **Game**. Expected outcome: **Everyone 10+ (fantasy violence)**.

| Question | Answer |
|---|---|
| Violence — does the game contain violence? | Yes — mild/fantasy: stylised units attack each other, no blood, no gore, units simply despawn |
| Realistic violence / gore | No |
| Sexual content / nudity | No |
| Profanity | No |
| Controlled substances | No |
| Gambling (simulated or real) | No |
| Users can interact / communicate | **Yes** — online multiplayer includes text chat between players |
| Users can share personal info | No (only a chosen display name is visible) |
| In-app purchases | No |
| Location sharing | No |

## Data safety form

App **collects** data (only when the user optionally signs in for online play). No data is
shared with third parties. All collected data is encrypted in transit. Users can request
deletion.

| Data type | Collected? | Shared? | Purpose | Optional? |
|---|---|---|---|---|
| Personal info → Name | Yes | No | Account management | Yes (only if signing in) |
| Personal info → Email address | Yes | No | Account management | Yes (only if signing in) |
| Personal info → User IDs | Yes | No | Account management | Yes (only if signing in) |
| Messages → Other in-app messages (match chat) | Yes | No | App functionality | Yes |
| App activity → Other user-generated content (formations, match records, leaderboard) | Yes | No | App functionality | Yes |
| Location, contacts, financial info, health, photos, device IDs, advertising ID | No | — | — | — |

Security-practice answers:
- Data encrypted in transit: **Yes** (Firebase TLS)
- Users can request data deletion: **Yes**
- Account deletion URL: `https://gen-lang-client-0969027846.web.app/account-deletion.html`
- Independent security review: No

## Other console settings

| Setting | Value |
|---|---|
| App access | All functionality available without special access (note: online play needs any Google account — provide a throwaway test account if the reviewer asks) |
| Ads | No, the app contains no ads |
| Target audience | 13+ (do not select under-13 age groups — avoids Families policy scope) |
| News app | No |
| COVID-19 tracing/status | No |
| Data safety | per table above |
| Government app | No |
| Financial features | None |

## Pre-launch reminders

- The privacy-policy and account-deletion pages go live with the next
  `firebase deploy --only hosting` (step 1 of the release checklist) — deploy before
  filling in the console forms so Google's link checker can see them.
- assetlinks.json must have the real SHA-256 before reviewers install, or the app
  shows a URL bar (checklist step 3).
