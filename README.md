# Latest version: 1.0.2

Download [PfandPause-html5-1.0.2.zip](https://github.com/Logic-syd/PfandPause/raw/refs/heads/downloads/PfandPause-html5-1.0.2.zip).

This version handles vertical touch drags inside nested game portal frames when the browser does not pan natively. It separates a swipe from a bottle tap and scrolls modal content independently. Direct links retain native scrolling, and the game does not impose a fixed zoom or frame size.

Create release `1.0.2` in the existing Game Jolt package, upload this ZIP as **Upload Browser Build**, enable **Fit to screen?**, keep HTTPS enabled, save the build, and publish the release once the build is Active.

Validation: 41 unit tests, typecheck/build, seven simulated viewport scenarios, audio fault protection, and cross-origin nested-frame scroll fault tests. The latter deliberately disable native touch panning: 1.0.1 fails to scroll while 1.0.2 passes vertical bottle swipes, no accidental move, subsequent tap/undo, independent order list scrolling, and two-finger event handling. Direct-link native scrolling also passes. These are Chromium tests; real iPhone Safari remains to be tested.

Source: https://github.com/Logic-syd/PfandPause/tree/e2eaf31108323fb2c5413e8563de1a8a735080e3

SHA-256: `f270cf3b99c05696e4814a97ccc2259e511d8978a6b422db20a608ed4d1e216a`

---

# Previous version: 1.0.1

Download [PfandPause-html5-1.0.1.zip](https://github.com/Logic-syd/PfandPause/raw/refs/heads/downloads/PfandPause-html5-1.0.1.zip) for the mobile and embedded-display update.

Game Jolt: https://gamejolt.com/games/pfand-pause/1106213

Create a new release named `1.0.1` in the existing package. Upload the ZIP under **Upload Browser Build**, enable **Fit to screen?**, keep **HTTPS support?** enabled, and **Save Build**. Publish the release once the build is **Active**.

The update adds independent scrolling in embedded game frames, larger mobile tap targets, a compact mobile board and protection against audio-output errors locking the controls. Tests passed at mobile sizes and 2K/4K with simulated display scaling. The reported friend's exact resolution/zoom problem still needs retesting on their device.

Source: https://github.com/Logic-syd/PfandPause/tree/872dadac99841b2c0903ac1003f5db0f9d1aa44f

SHA-256: `73eaf7a4dcf3adc53d05b92f562a2dcdde5962e9fe7d2ace50cedc41ebbb07fa`

The unversioned ZIP below is the original 1.0.0 package and remains available.

---

# Pfand Pause publishing files

Download `PfandPause-html5.zip` and upload that ZIP as the HTML5/browser build on your game platform. The archive contains index.html at its root and the required assets. Do not use GitHub's Download ZIP button for the whole branch.

`listing.md` contains Chinese, English and German game descriptions. The PNG files are real gameplay screenshots.

Build source: Logic-syd/PfandPause commit d86242da4b2c0279d5294bd3b7c0da866adaa244.
Game ZIP SHA-256: b31da0d948ee7256956f9ea512073c9f2df32e9c06ecc9c493dc0b486f3a75ac.

## Game Jolt page design

Download `PfandPause-images.zip` and extract it. Use `gamejolt-header.png` for the header, `gamejolt-thumbnail.png` for the required thumbnail, and the other PNGs for gameplay media. The header and thumbnail are promotional illustrations. Adjust the site cropper to keep the logo and bottles visible.