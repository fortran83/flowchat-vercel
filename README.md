# FlowChat — WhatsApp Simulator for Salesforce Flow Demos

A local WhatsApp-style messaging simulator that integrates directly with Salesforce Flow as a native Apex action. Flow sends a message, the phone UI displays it, the user taps a reply button, and the **same Flow continues** — no Platform Events, no Pause elements, no variables to manage.

---

## How It Works

```
Salesforce Flow
      │
      │  [Send Message to FlowChat] Apex Action
      │  → Sends message + buttons
      │  → HOLDS the HTTP connection open (long-poll)
      ▼
FlowChat Backend (Express + Socket.IO)
      │
      │  WebSocket push
      ▼
Phone UI (React — WhatsApp light mode)
      │
      │  User taps a button
      ▼
FlowChat Backend resolves the pending response
      │
      │  HTTP response returned to Apex
      ▼
Salesforce Flow receives buttonText as output
      │
      ▼
[Decision Element] branches by buttonText value
```

The key insight: the Apex action blocks Flow execution (up to 114 seconds) waiting for the button tap. When the user taps, `buttonText` is returned directly as an output variable — no SOQL, no record updates, no secondary flows.

---

## Quick Start

```bash
cd flowchat
./start.sh
```

Open: **http://localhost:5173**

Manual start:

```bash
# Terminal 1 — backend
cd backend && npm install && npm run dev

# Terminal 2 — frontend
cd frontend && npm install && npm run dev

# Terminal 3 — expose to Salesforce
ngrok http 3001
```

---

## Phone UI

- WhatsApp light mode — exact colors, wallpaper, bubbles, ticks
- **Hidden settings**: click the **⋮ three-dot button** in the chat header to change the contact name and avatar photo (upload file or paste URL). Nothing is visible to the audience during a demo.
- **Hidden chat clear**: **double-click the date chip** (e.g. "Jun 23") at the top of the chat area to instantly clear all messages. No button shown.
- Supports message text, images, and up to 5 reply buttons per message.

---

## Salesforce Setup

### 1. Deploy the Apex Action

```bash
cd salesforce/sfdx
sf project deploy start --metadata ApexClass:FlowChatSendMessage
sf project deploy start --metadata ApexClass:FlowChatSendMessageTest
```

### 2. Named Credential

The Named Credential `FlowChat` points to your ngrok URL. Update `salesforce/sfdx/force-app/main/default/namedCredentials/FlowChat.namedCredential-meta.xml` with your current ngrok URL and redeploy:

```bash
sf project deploy start --metadata NamedCredential:FlowChat
```

Current endpoint in file: `https://reusable-species-coveted.ngrok-free.dev`

### 3. Remote Site Setting

Setup → Security → Remote Site Settings → add your ngrok URL.

---

## Flow Builder Usage

1. Create a new **Autolaunched Flow** (Screen Flow also works)
2. Add an **Action** element — search for **"Send Message to FlowChat"** under the FlowChat category
3. Fill in the inputs:

| Input Field | Required | Description |
|---|---|---|
| Message Text | ✅ | The message body. Use `\n` for line breaks (e.g. `Hello\n\nHow are you?`) |
| Contact Name | — | Name shown in the chat header (e.g. `Mr. Khalid`) |
| Image URL | — | Optional image displayed above the message text |
| Button 1–5 Label | — | Reply button labels (up to 5) |

4. Store the outputs in Flow variables:

| Output | Type | Description |
|---|---|---|
| `buttonText` | Text | Label of the button the user tapped |
| `buttonId` | Text | Internal ID (btn_1, btn_2 …) |
| `conversationId` | Text | Auto-generated UUID for this message |
| `success` | Boolean | True if user tapped, false if timed out |
| `timedOut` | Boolean | True if no tap within 114 seconds |

5. Add a **Decision** element after the action, branching on `{!buttonText}`:

```
[Send Message to FlowChat]
        │
        ▼
   [Decision]
    buttonText = "Yes, arrange viewing"  → [Create Task]
    buttonText = "Send brochure"         → [Send Email]
    buttonText = "Not interested"        → [Update Record]
```

---

## Message Formatting

Flow Builder's text input is single-line. Use `\n` as a line break escape — the backend converts it to a real newline before displaying.

**Example — paste into Message Text field:**
```
Dear Mr. Khalid,\n\nThank you for your interest in Rolls-Royce Motor Cars Dubai.\n\nWhich timing would be most convenient?
```

**Renders as:**
```
Dear Mr. Khalid,

Thank you for your interest in Rolls-Royce Motor Cars Dubai.

Which timing would be most convenient?
```

WhatsApp also renders `*text*` as **bold** if you want emphasis.

---

## ngrok

FlowChat runs locally. ngrok exposes it to Salesforce:

```bash
ngrok http 3001
# → https://xxxx-xxxx.ngrok-free.app
```

Each time ngrok restarts the URL changes (on a free plan). Update the Named Credential and Remote Site Setting when it does, then redeploy:

```bash
sf project deploy start --metadata NamedCredential:FlowChat
```

The current static domain configured: `reusable-species-coveted.ngrok-free.dev`

---

## Project Structure

```
flowchat/
├── backend/
│   └── src/
│       ├── index.ts                  — Express + Socket.IO server
│       ├── routes/
│       │   ├── flow.ts               — /api/flow/send-and-wait, /api/flow/tap
│       │   └── messages.ts           — /api/messages/reset
│       ├── services/
│       │   ├── database.ts           — SQLite (conversations, messages, audit)
│       │   └── pendingRequests.ts    — Long-poll response manager
│       └── types/index.ts
├── frontend/
│   └── src/
│       ├── App.tsx                   — Root: phone + hidden admin state
│       ├── components/
│       │   ├── PhoneFrame.tsx        — Phone shell, header, input bar, settings menu
│       │   ├── MessageBubble.tsx     — Inbound/outbound bubbles + reply buttons
│       │   └── TypingIndicator.tsx   — Animated dots
│       └── hooks/
│           └── useFlowChat.ts        — Socket.IO connection + state
└── salesforce/sfdx/force-app/main/default/
    ├── classes/
    │   ├── FlowChatSendMessage.cls        — @InvocableMethod Apex action
    │   └── FlowChatSendMessageTest.cls    — 4 unit tests
    ├── objects/Flow_Conversation__c/      — Custom object (unused in long-poll mode)
    └── namedCredentials/FlowChat.namedCredential-meta.xml
```

---

## API Reference

### `POST /api/flow/send-and-wait`
Called by the Apex action. Pushes the message to the UI and holds the connection open until the user taps.

**Body:**
```json
{
  "messageText": "Which option suits you best?",
  "contactName": "Mr. Khalid",
  "imageUrl": "https://example.com/car.jpg",
  "button1Label": "Arrange viewing",
  "button2Label": "Send brochure",
  "button3Label": "Not interested"
}
```

**Response (on button tap):**
```json
{
  "buttonText": "Arrange viewing",
  "buttonId": "btn_1",
  "conversationId": "uuid-here",
  "timedOut": false
}
```

**Response (on timeout after 114s):**
```json
{
  "buttonText": null,
  "buttonId": null,
  "conversationId": "uuid-here",
  "timedOut": true
}
```

### `POST /api/flow/tap`
Called by the frontend when a button is tapped. Resolves the pending long-poll.

### `POST /api/messages/reset`
Clears a conversation.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Send Message to FlowChat" not in Flow | Redeploy `FlowChatSendMessage.cls`, check org connection with `sf org list` |
| Callout error in Flow | ngrok not running, or Named Credential URL is outdated |
| Message doesn't appear on phone | Backend not running on port 3001, or frontend not connected to WebSocket |
| Name in header won't change | Fixed — header now always shows the admin Contact Name setting, not the Flow contactName field |
| ngrok URL changed | Update `FlowChat.namedCredential-meta.xml` endpoint and redeploy Named Credential |
| Chat won't clear | Double-click the date chip (e.g. "Jun 23") at the top of the chat area |
| `\n` not working | Ensure backend is running the latest version — `tsx watch` auto-reloads on save |

---

## Salesforce Org

- **Alias:** `salesforce-main-m8n5ib`
- **Username:** `storm.75a3740fa74e9f@salesforce.com`
- **Apex Class deployed:** `FlowChatSendMessage` + `FlowChatSendMessageTest`
- **Flow type:** Autolaunched Flow (Screen Flow also works)
- **Flow action category:** FlowChat
