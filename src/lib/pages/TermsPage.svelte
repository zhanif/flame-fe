<script lang="ts">
  import LegalLayout from '$lib/components/LegalLayout.svelte';
  import LegalSection from '$lib/components/LegalSection.svelte';
  import { bot } from '$lib/stores/bot.svelte';
</script>

<LegalLayout title="Terms of Service" updated="14 October 2026" other={{ page: 'privacy', label: 'Privacy Policy' }}>
  <p class="text-sm leading-relaxed text-zinc-300">
    These terms govern your use of the {bot.name} bot and dashboard (the "Service"). By adding the bot to a server, logging in to the dashboard or using its commands you agree to them and to the Privacy Policy. If you do not agree, do not use the Service.
  </p>

  <LegalSection n={1} title="Eligibility">
    <p>You must meet the minimum age Discord requires in your country and follow <a class="text-orange-400 hover:text-orange-300 underline underline-offset-2" href="https://discord.com/terms" target="_blank" rel="noreferrer">Discord's Terms of Service</a> and Community Guidelines. To add the bot to a server you need permission to manage that server.</p>
  </LegalSection>

  <LegalSection n={2} title="What the Service is">
    <p>{bot.name} is one Discord application that serves many servers. A server starts with no modules and its admins install only the ones they want, such as Quotes, Booster or Anti Tamper. Each module is configured per server in the dashboard. The Service also gives every server the always-present admin pages: Slash, Settings and Audit logs.</p>
    <ul>
      <li>Installing a module records it and does nothing on Discord by itself. Slash commands are registered one at a time, by an admin's click on the Slash page.</li>
      <li>Some modules act on members: Booster and Anti Tamper give or remove roles, and a sweep changes roles for the whole server. These run because a server admin turned them on, and they are that server's decision.</li>
    </ul>
  </LegalSection>

  <LegalSection n={3} title="Server admins are responsible">
    <p>Whoever installs and configures a module is responsible for how it is used in their server, including telling their members what it does and complying with the law and Discord's rules. Roles and permissions are decided by each server: admins are people with Administrator or Manage Server (or a role the server chose), and moderators are people with message or member moderation permissions (or a role the server chose).</p>
  </LegalSection>

  <LegalSection n={4} title="Acceptable use">
    <ul>
      <li>Do not use the Service to harass, harm or deceive anyone, or to break the law or Discord's rules.</li>
      <li>Do not attempt to access data of servers you are not an admin or moderator of, bypass permission checks, or disrupt the Service (for example by flooding commands or the API).</li>
      <li>Do not reverse engineer the Service to evade limits, or use automated means to log in or scrape the dashboard.</li>
      <li>Do not quote or publish content you have no right to share, or content that is illegal.</li>
    </ul>
    <p>We may limit or block a person or a server that breaks these rules, without notice where needed to protect others.</p>
  </LegalSection>

  <LegalSection n={5} title="Your content and your data">
    <p>You keep your rights in what you write. A quote is a copy of a message that someone in a server chose to turn into a card; if you do not want your messages quoted, tell that server's staff, who can delete the quote. How we handle personal data is described in the Privacy Policy.</p>
  </LegalSection>

  <LegalSection n={6} title="Availability and changes">
    <p>The Service is provided as is. It may be unavailable, change, or lose features at any time, and a module may be added, changed or removed. Where we can, we will avoid removing something people rely on without notice.</p>
  </LegalSection>

  <LegalSection n={7} title="No warranty and limited liability">
    <p>We give no warranty that the Service is error free, uninterrupted, or fit for a particular purpose. Automatic actions such as removing roles depend on the permissions and role order of your server and on Discord being available, and they can fail or act on a wrong configuration. To the extent the law allows, we are not liable for indirect or consequential loss, loss of roles, messages or data, or server changes caused by the Service or by an admin's configuration.</p>
  </LegalSection>

  <LegalSection n={8} title="Termination">
    <p>You can stop at any time by removing the bot from your server and logging out. Uninstalling a module deletes its data in that server. We may suspend or end access to the Service for a person or a server that breaks these terms.</p>
  </LegalSection>

  <LegalSection n={9} title="Governing law and changes">
    <p>These terms are governed by Indonesian law, and if a provision cannot be enforced the rest still applies. We may update these terms; the date at the top shows the latest version, and continuing to use the Service after a change means you accept it.</p>
  </LegalSection>

  <LegalSection n={10} title="Contact">
    <p>For questions about these terms, contact the operator through the {bot.name} account on Discord or the server where you found the bot.</p>
  </LegalSection>
</LegalLayout>
