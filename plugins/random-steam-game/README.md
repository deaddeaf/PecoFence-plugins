# Random Steam Game

A desktop card that draws from randomly sampled pages of Steam’s public game search
and several depths of its Top Sellers list.
It changes the game every ten minutes while the fence is visible. Click the dice or
press **N** while the card has keyboard focus to choose a new game. The card avoids the
last 250 games it showed. If the local pool is empty, it can draw from 48 bundled games.

The draw chooses a review-count range first, then an unseen game in that range.
The target weights are 35% for 5,000–8,999, 25% for 9,000–19,999, 15% for 20,000
or more, 10% for 1,000–4,999, 10% for 500–999, and 5% for 0–499 Steam reviews
or games Steam returned without a review summary. Ranges without candidates are
skipped and their weight is distributed among the available ranges. A game whose
details have yet to load can still appear while the pool is being prepared.

The arrow buttons and frame indicators browse the gallery. Artwork fades between frames.
Autoplay stops when the gallery is hovered or focused, the fence is hidden, or reduced
motion is enabled. Click the game’s title to open its store page. The card uses Russian
when PecoFence is set to Russian and English otherwise.

## Network and privacy

- `store.steampowered.com` receives a page offset for its public search and, separately,
  the current public game’s numeric Steam App ID and display language for fallback
  store details. The two requests share a limit of one per 61 seconds while the
  fence is visible. The same host serves the store page when the title opens in a browser.
- `api.steampowered.com` receives up to 12 public App IDs, the PecoFence display language,
  and the region from the WebView’s language setting (US if absent). Steam returns
  descriptions, public tag IDs, artwork paths, and summary review totals. The plugin
  prefers prepared cards within the selected review range. At rest the host
  receives at most one request per 61 seconds. Choosing a game explicitly can trigger
  an earlier request. Both Steam endpoints work without a Steam account or API key.
- `shared.akamai.steamstatic.com` receives ordinary HTTPS image requests for the current
  game’s public cover or screenshots. One request can run at a time, and automatic artwork
  loads are at least 61 seconds apart. Selecting a frame or rolling the dice can load
  artwork sooner.
  Image requests omit cookies and referrers. The gallery shows what is available if Steam is
  unavailable. The artwork URLs are restricted to the current App ID and the named host.
- `steamdb.info` opens the public statistics page in the default browser only when the user
  clicks its button. The plugin does not fetch or scrape SteamDB.
- The `apps` permission checks only whether `steam.exe` is running. This status stays on the
  PC. On a title click, the `system` permission lets the card pass the public game's
  `steam://store/` link to an already running Steam client using
  `C:\Program Files (x86)\Steam\steam.exe` with `-ifrunning`. The game page opens in the
  default browser when Steam is closed, when it is installed elsewhere, or when Windows
  program access is disabled.

Steam and its CDN receive the IP address the connection originates from. No Steam credentials
or personal files are used. The local pool, recent game IDs, and the next change
time are kept in the fence’s local browser storage. Screenshots are kept in memory until a
new game is selected. The game card is independent of Valve and SteamDB.

## Credits

The card design is by deaddeaf. Artwork is served at runtime by Steam; the package does not
contain publisher artwork. The interface icons are adapted from Boxicons and Andrés Raxón’s
External Link icon. Montserrat is included under the SIL Open Font License, with its notice below.
Common tag labels come from Steam’s public localized tag lists.

## Third-party notices


### Montserrat — SIL Open Font License 1.1

```text
Copyright 2024 The Montserrat.Git Project Authors (https://github.com/JulietaUla/Montserrat.git)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

### Boxicons

```text
The MIT License (MIT)

Copyright (c) 2015-2021 Aniket Suvarna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Andrés Raxón icons

```text
MIT License

Copyright (c) 2026 Andrés Raxón (andrsrxn)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
