export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 border-b-2 border-emerald-500 pb-4 mb-6">
          FreeGPT Privacy Policy
        </h1>
        <p className="text-gray-500 text-sm mb-6">Last updated: December 2024</p>

        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6">
          <p className="font-semibold">The Deal:</p>
          <p>You get FREE access to ChatGPT Plus ($20/month value). In exchange, we collect and analyze your ChatGPT conversations for research purposes.</p>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <p className="font-semibold">Important:</p>
          <p>By using FreeGPT, you agree that your ChatGPT conversations will be collected and stored on our servers. Do not use FreeGPT if you need to keep your conversations private.</p>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What We Collect</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Your Messages:</strong> Everything you type to ChatGPT</li>
            <li><strong>AI Responses:</strong> All responses ChatGPT provides to you</li>
            <li><strong>Metadata:</strong> Timestamps, conversation IDs, and the ChatGPT model used</li>
            <li><strong>Product Data:</strong> If ChatGPT recommends products, we track what was recommended and what you clicked</li>
            <li><strong>Device Identifier:</strong> A randomly generated ID to group your conversations (not personally identifiable)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What We DON&apos;T Collect</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Your name or email address</li>
            <li>Your ChatGPT account credentials</li>
            <li>Data from other websites or apps</li>
            <li>Your browsing history outside of ChatGPT</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Research:</strong> Understanding how people interact with AI assistants</li>
            <li><strong>Analysis:</strong> Identifying patterns in AI-human conversations</li>
            <li><strong>Product Insights:</strong> Studying how AI product recommendations influence user behavior</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Sharing</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Your data may be used in aggregate research studies</li>
            <li>Individual conversations may be reviewed by our research team</li>
            <li>We do NOT sell your individual data to advertisers</li>
            <li>We do NOT share your data with OpenAI or other AI companies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Storage & Security</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Data is stored on secure cloud servers (Convex)</li>
            <li>All data transmission uses HTTPS encryption</li>
            <li>Access to data is restricted to authorized research personnel</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Rights</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Stop participating:</strong> Simply uninstall the extension</li>
            <li><strong>Request deletion:</strong> Contact us to request removal of your data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">No Access to Your Data</h2>
          <p className="text-gray-600">
            Unlike typical tracking tools, you do NOT have access to view, export, or manage your collected data.
            This is a one-way data collection for research purposes in exchange for free ChatGPT access.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact</h2>
          <p className="text-gray-600">
            For questions about this privacy policy or to request data deletion, contact us at the email provided on the Chrome Web Store listing.
          </p>
        </section>

        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mt-8">
          <p className="font-semibold">Remember:</p>
          <p>If you need private conversations with ChatGPT, do not use FreeGPT. Use a regular ChatGPT account instead.</p>
        </div>
      </div>
    </div>
  );
}
