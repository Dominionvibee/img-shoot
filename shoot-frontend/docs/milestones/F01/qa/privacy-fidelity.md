# Privacy web form fidelity verification

Verified 21 November 2026 against the live [OneTrust privacy web form](https://privacyportal.onetrust.com/webform/889c435d-64b4-46d8-ad05-06332fe1d097/db459d3a-bffa-4cb2-a6fd-0daa31651507?website=imgmodels.com). Local route: `http://localhost:4173/do-not-sell-my-personal-info`.

## Implementation

The local page now uses the rendered source DOM, original compiled OneTrust styles, the original Open Sans fonts and icon fonts, WME Fashion logo, and OneTrust artwork. It preserves the source's English-only disabled language input, required markers, searchable country and calling-code comboboxes, acknowledgment, disabled red submit button, powered-by row, and centered New York/London contact footer. The previously invented IMG navigation footer and home links were removed. Policy labels keep their exact source text and navigate to the local policy routes.

The source uses a normal light Google reCAPTCHA v2 checkbox. The local page renders the actual Google widget with Google's documented public testing site key. It requires a returned test token and valid fields before enabling Submit. Submitting performs only a local preview and explicitly states that no privacy request was submitted or stored. No source form was submitted and no source CAPTCHA was solved during verification.

## Browser comparisons

Original and local pages were captured in Chrome at widths **320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 px**, with a 900 px viewport height.

- All nine widths have equal document heights and no horizontal overflow.
- The logo, language input, form, first name, last name, email, calling-code input, phone input, country input, and submit button match the original in x/y position, width, height, font, foreground/background color, padding, margin, and opacity. No measured differences remained.
- The scrolled CAPTCHA states were captured as viewport screenshots so the cross-origin widget actually painted. At every width the only pixel differences were the **1,650 pixels** making up Google's public-test-key warning. There were **zero differing pixels outside the CAPTCHA rectangle**. See `reference/privacy/pixel-comparison.json` and `original-visible-*.png` / `local-visible-*.png`.
- The tested invalid-email, invalid-phone, and unmatched-country state screenshots were byte-identical once the native widget was outside the painted screenshot. Seven input states and six error containers also matched in values, invalid flags, borders, visible messages, and error heights.
- Focus/blur validation preserves the exact visible required message, `This field is required`. The source marks invalid email and phone fields without a visible explanatory message; no replacement message was invented. Unmatched country text clears on blur as in the source.
- Country dropdown options (250) and calling-code options (249) were captured from the original. Local filtering, pointer choice, arrow-key/Enter choice, Escape, and country clearing were checked.
- The local public-test checkbox was clicked in-browser. Submit remained disabled until the widget returned a token, then showed the explicit local-preview result. The test recorded **zero OneTrust requests** and **zero uncaught browser exceptions**.

Detailed browser evidence is in `reference/privacy/`: original source/DOM/styles, nine-width measurements and screenshots, scrolled widget comparisons, validation comparisons, and `submit-check.json`.

## Deliberate limits

Google displays a testing warning inside the local widget. This is expected for its [official v2 testing key](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha-what-should-i-do) and remains visible. The local preview does not impersonate a successfully filed privacy request. A production workflow would require the owner's valid domain key and an authorized backend that verifies tokens and processes requests; neither production verification nor production submission is simulated here.

No success state from a real privacy submission was inspected or invented. The initial calling-code value is Nigeria (+234), matching the inspected source in this environment. Google's external service still requires network access; a load failure keeps submission disabled and is reported honestly.

## Reproduce

From the repository root, while the source server is running at port 4173:

```powershell
node .f01-work/scripts/privacy-qa.mjs
node .f01-work/scripts/privacy-visible-qa.mjs
python .f01-work/scripts/privacy-pixels.py
node .f01-work/scripts/privacy-interactions.mjs
node .f01-work/scripts/privacy-submit-qa.mjs
```

The browser helper uses the existing headless Chrome CDP session and opens/closes its own tab. The pixel script requires Pillow. Capture/import scripts are retained separately so ordinary QA does not overwrite the implementation with a new source snapshot.
