<script lang="ts">
  import LegalLayout from '$lib/components/LegalLayout.svelte';
  import LegalSection from '$lib/components/LegalSection.svelte';
  import { bot } from '$lib/stores/bot.svelte';
</script>

<LegalLayout title="Privacy Policy" updated="14 October 2026" other={{ page: 'terms', label: 'Terms of Service' }}>
  <p class="text-sm leading-relaxed text-zinc-300">
    This policy explains what {bot.name} ("we", "us") collects, why, and how long it is kept. {bot.name} is a Discord bot and a dashboard that lets server staff install modules and configure them per server. We keep to what each feature needs and we do not sell data. This policy is part of the Terms of Service.
  </p>

  <LegalSection n={1} title="What we collect">
    <p><strong>When you log in to the dashboard</strong> (Discord OAuth2, scopes <em>identify</em> and <em>guilds</em>):</p>
    <ul>
      <li>Your Discord user ID, username and avatar.</li>
      <li>The list of servers you are in, with your permissions there. It is used only to show the servers where you are a moderator or admin, and is cached for about a minute.</li>
      <li>The access token Discord gives us. It stays on our server in a session record and is removed when the session expires or you log out. It is never sent to your browser.</li>
    </ul>
    <p><strong>For every server the bot is in:</strong> the server ID and name, its language, time zone and command prefix, the role IDs the server added as admin or moderator roles, which modules are installed, and who installed them.</p>
    <p><strong>An audit log</strong> of configuration changes in each server: who did it (a user ID, or "system" when the bot acted on its own), what changed (before and after), the reason, and the time.</p>
    <p><strong>Module data</strong>, only for modules a server has installed, and only what that module needs:</p>
    <ul>
      <li><strong>Quotes</strong>: the text of a message someone chose to quote, its author and the person who quoted it (user IDs), the channel and message IDs, the IDs of the card and published messages the bot posted, the publish channel, and, for deleted quotes, who deleted them and why.</li>
      <li><strong>Booster</strong> and <strong>Anti Tamper</strong>: the role, channel and user IDs the server configured (protected roles, exceptions, log channel). They read members' roles and boost status to apply the rules, but do not store them.</li>
      <li><strong>Autoremover</strong>: for each message it picks up in the watched channel, the message, channel and author IDs, the file names (or a note that it is a text message), when it is due to be deleted, and how it ended. The files and the text themselves are never copied.</li>
      <li><strong>Role Colors</strong>: the role and command each color is set up with, and a history of who changed which color, with the colors before and after.</li>
      <li><strong>File Submissions</strong>: for each entry, the member IDs (owner and sender), the message and channel IDs in the review box, the round name, the review result and reason, and any upvotes. The files stay in the Discord message only.</li>
      <li><strong>OCR Detection</strong>: for each image posted in the watched channel, the message, channel and author IDs, the file name, a temporary link to the image, and the result (safe, or which blocklist terms matched, and what a moderator did about the report). The text found in an image is compared with the blocklist and is not stored.</li>
    </ul>
    <p><strong>Command content.</strong> To recognise text commands the bot reads messages in servers it is in (Discord's Message Content intent), and to enforce role rules it sees member role and boost changes (Server Members intent). Messages and member details are used to run the command or rule and are not stored, except where a feature above says otherwise.</p>
    <p><strong>Cookies.</strong> Two functional cookies, both HTTP only: one during login to protect against forged logins, and one that keeps you signed in. We use no analytics, advertising or tracking cookies. Your theme choice and the bot's name and avatar are kept in your browser's local storage.</p>
  </LegalSection>

  <LegalSection n={2} title="What we do not collect">
    <ul>
      <li>Passwords, email addresses, payment details or your location.</li>
      <li>Direct messages, voice, or the content of messages that are not commands or quotes someone chose to create.</li>
      <li>Anything for advertising, profiling or sale.</li>
    </ul>
  </LegalSection>

  <LegalSection n={3} title="Where it is processed">
    <p>Data is stored in our own PostgreSQL database and Redis cache. Redis holds sessions, a short-lived cache of Discord display names and avatars (about an hour), your server list (about a minute), and per-server settings that are read often.</p>
    <p>Besides Discord itself, which provides the platform and the data above, there is one third party: when a server turns on <strong>OCR Detection</strong>, each image posted in its watched channel is downloaded and sent to <strong>OCR.space</strong>, an online text recognition service, which returns the text it reads. Nothing else about you is sent. Images from servers that do not use OCR Detection are never sent anywhere.</p>
  </LegalSection>

  <LegalSection n={4} title="How long we keep it">
    <ul>
      <li><strong>Sessions</strong>: until they expire or you log out.</li>
      <li><strong>Module data</strong>: until the module is uninstalled in that server, which deletes everything it stored there.</li>
      <li><strong>OCR image links</strong>: removed as soon as an image has been read and found safe, or when a moderator handles its report, and in any case after 30 days.</li>
      <li><strong>Deleted quotes</strong>: kept, marked as deleted, so the audit trail stays complete and the same message is not quoted twice, until the Quotes module is uninstalled or you ask us to erase them.</li>
      <li><strong>Audit logs and server records</strong>: while the server is registered with the bot. They are deleted when the server's record is removed.</li>
    </ul>
  </LegalSection>

  <LegalSection n={5} title="Your choices and rights">
    <p>You can log out at any time, and you can revoke the app's access in Discord under Settings, Authorized Apps. Server admins can uninstall any module to remove its data. You may ask what we hold about you, ask us to correct it, or ask us to delete it (including quotes of your messages and your user ID in audit logs), and we will do so unless we must keep something to meet a legal duty. Use the contact in section 8.</p>
  </LegalSection>

  <LegalSection n={6} title="Security">
    <p>Access to the dashboard requires a Discord login and is limited by your permissions in each server: moderators can view, admins can change. Sessions use HTTP only cookies and are stored server side. No system is perfectly secure, so we cannot guarantee absolute security, but we limit what we store to reduce what could be exposed.</p>
  </LegalSection>

  <LegalSection n={7} title="Children">
    <p>{bot.name} is not directed at anyone under the minimum age Discord allows in their country. If you believe such a person's data was collected, contact us and we will delete it.</p>
  </LegalSection>

  <LegalSection n={8} title="Changes and contact">
    <p>We may update this policy as features change; the date at the top shows the latest version, and using the service after a change means you accept it. For questions or requests about your data, contact the operator through the {bot.name} account on Discord or the server where you found the bot.</p>
  </LegalSection>
</LegalLayout>
