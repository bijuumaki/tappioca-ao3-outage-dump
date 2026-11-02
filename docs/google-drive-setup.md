# Connecting Google Drive (one-time setup)

Think of the bridge as a **mail slot in the door of your "Fic Library" folder**. The website can post files through the
slot and ask what's inside, but it can't open the door, take things out of other rooms, or throw anything away. The slot
only opens for someone who knows the **secret word** (the TOKEN).

Do all of this signed in to Google as **imong.mama.kuan@gmail.com** (the account that owns "Fic Library").

```
START
  │
  ▼
[1] Open the Fic Library folder in Google Drive.
    Look at the address bar:  drive.google.com/drive/folders/XXXXXXXXXXXX
    Copy the long part at the end (XXXXXXXXXXXX). That's the FOLDER_ID.
  │
  ▼
[2] Go to script.google.com  →  New project  →  name it "Tappioca Drive bridge".
  │
  ▼
[3] Delete everything in the editor. Open apps-script/drive-bridge.gs from the project folder,
    copy ALL of it, paste it in. Press the save icon.
  │
  ▼
[4] Left side: the gear icon (Project Settings)  →  scroll to "Script properties"  →  Add script property.
    Add two:
        FOLDER_ID  =  (the long part from step 1)
        TOKEN      =  (a long secret you make up: 30+ random letters and numbers. Write it down for step 7.)
    Save.
  │
  ▼
[5] Top right: Deploy  →  New deployment  →  gear icon next to "Select type"  →  Web app.
        Execute as:      Me (imong.mama.kuan@gmail.com)
        Who has access:  Anyone
    Deploy  →  "Authorize access"  →  choose your account  →  Advanced  →  "Go to Tappioca Drive bridge (unsafe)"  →  Allow.
    (Google says "unsafe" for every script you write yourself.)
  │
  ▼
[6] Copy the "Web app" URL it shows. It starts with https://script.google.com/macros/s/ and ends with /exec.
  │
  ▼
[7] Add two lines to the file  .env.local  in the project folder (open it the same way as before: Finder → Cmd+Shift+. → TextEdit):
        DRIVE_BRIDGE_URL=(the URL from step 6)
        DRIVE_BRIDGE_TOKEN=(the TOKEN from step 4)
    No spaces, no quotes. Save.
  │
  ▼
[8] Do the same two lines in Vercel:  vercel.com  →  tappiocarchive  →  Settings  →  Environment Variables.
    (Mark the token as "Sensitive".)  Then redeploy.
  │
  ▼
DONE. On the Uploads screen the line "Google Drive: connected to Fic Library" appears.
```

## Good to know

- **"Anyone" access** only means the address works without a Google login (the website can't log in). Without the
  TOKEN every request is refused, and the address itself is a long random string.
- **If the TOKEN ever leaks:** change it in Script properties (step 4) and in `.env.local` and Vercel. Nothing else needs to change.
- **Changing the script later:** Deploy → Manage deployments → pencil icon → Version: New version → Deploy. The address stays the same.
- **Never overwrites:** if a file with the same name already exists, the new one gets a time stamp in its name.
- **Also share the folder with arellano.blessiejustine@gmail.com as Editor** so Claude can double-check that files really arrived.
