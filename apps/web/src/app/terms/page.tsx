import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { ThemeLogo } from '@/components/theme-logo';

export const metadata: Metadata = {
  title: 'Terms & Conditions NoviMP',
  description: 'Read our Terms and Conditions before using the NoviMP platform.',
};

const LAST_UPDATED = 'September 18, 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <ThemeLogo width={32} height={32} className="rounded-lg" />
            <span className="font-bold tracking-tight">NoviMP</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Terms &amp; Conditions</h1>
          <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-sm leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By registering for, accessing, or using the NoviMP platform (&ldquo;Service&rdquo;), you
              agree to be bound by these Terms &amp; Conditions (&ldquo;Terms&rdquo;). If you do not agree,
              do not use the Service. These Terms form a binding legal agreement between you and
              NoviMP (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Eligibility</h2>
            <p className="text-muted-foreground">
              You must be at least 18 years old and legally capable of entering into binding
              contracts under the laws of your jurisdiction to use the Service. By creating an
              account, you represent and warrant that you meet these requirements. We reserve the
              right to terminate accounts that do not comply.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Account Registration</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>You must provide accurate and complete information when creating your account.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials.</li>
              <li>You must notify us immediately if you suspect unauthorized use of your account.</li>
              <li>
                One account per user. Creating multiple accounts to circumvent restrictions is
                prohibited and will result in immediate suspension.
              </li>
              <li>
                Your account is personal and non-transferable. You may not sell, gift, or otherwise
                transfer your account to any third party.
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Services &amp; Orders</h2>
            <p className="text-muted-foreground">
              NoviMP aggregates digital services from third-party providers including virtual
              phone numbers, proxy services, and social media engagement (SMM) services. By placing
              an order you acknowledge:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>
                Orders are fulfilled by independent providers. Delivery times and availability may
                vary.
              </li>
              <li>
                All prices are displayed in the currency of your wallet and are subject to change
                without notice. The price shown at checkout is the price charged.
              </li>
              <li>
                Orders are generally non-reversible once submitted to a provider. Review your order
                carefully before confirming.
              </li>
              <li>
                SMM engagement services are provided for lawful promotional purposes only. You are
                solely responsible for ensuring your use complies with the respective platform&apos;s
                Terms of Service.
              </li>
              <li>
                Virtual numbers and proxies may only be used for lawful purposes. Use for spam,
                fraud, phishing, or any illegal activity is strictly prohibited.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Wallet &amp; Payments</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>
                All services are prepaid through your in-app wallet. Your wallet balance holds
                funds denominated in the specified currency.
              </li>
              <li>
                Deposits are processed through third-party payment processors (Stripe, crypto
                networks, or bank transfer). We do not store card details.
              </li>
              <li>
                Wallet balances are non-transferable and cannot be withdrawn as cash unless
                explicitly offered by us in writing.
              </li>
              <li>
                Refunds for failed or undeliverable orders are credited back to your wallet at our
                discretion. No cash refunds are issued except as required by applicable law.
              </li>
              <li>
                Chargebacks initiated against valid transactions will result in immediate account
                suspension and may result in permanent bans.
              </li>
              <li>
                We reserve the right to freeze or close wallets found to be associated with
                fraudulent activity, money laundering, or violations of these Terms.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Prohibited Uses</h2>
            <p className="text-muted-foreground">You agree not to use the Service to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>Violate any applicable law, regulation, or third-party rights.</li>
              <li>
                Engage in fraud, phishing, identity theft, spam, or any deceptive practices.
              </li>
              <li>
                Attempt to reverse-engineer, scrape, or otherwise access our systems in an
                unauthorized manner.
              </li>
              <li>Resell services without our prior written consent.</li>
              <li>
                Use proxies or numbers to send unsolicited communications (spam/robocalls).
              </li>
              <li>
                Circumvent geographic restrictions, access controls, or intellectual-property
                protections.
              </li>
              <li>
                Upload or transmit viruses, malware, or any other harmful code to our platform.
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, trademarks, logos, and software on the platform are owned by or licensed
              to NoviMP. You are granted a limited, non-exclusive, non-transferable licence to
              access and use the Service for personal or business purposes as permitted by these
              Terms. Nothing in these Terms transfers any intellectual property rights to you.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Privacy &amp; Data</h2>
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our Privacy Policy, which is incorporated
              into these Terms by reference. By using the Service you consent to the collection and
              use of your information as described therein. We implement industry-standard security
              measures but cannot guarantee absolute security.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Disclaimers</h2>
            <p className="text-muted-foreground">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty of any kind,
              express or implied, including but not limited to merchantability, fitness for a
              particular purpose, and non-infringement. We do not warrant that the Service will be
              uninterrupted, error-free, or free of viruses.
            </p>
            <p className="mt-2 text-muted-foreground">
              Third-party provider catalog data (pricing, availability, delivery times) is synced
              automatically and may not always reflect real-time conditions. We make no guarantees
              as to the accuracy of catalog information.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by applicable law, NoviMP and its officers,
              employees, and partners shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages including loss of profits, data, or goodwill
              arising from your use of or inability to use the Service, even if advised of the
              possibility of such damages.
            </p>
            <p className="mt-2 text-muted-foreground">
              Our total aggregate liability to you for any claim arising out of or relating to these
              Terms or the Service shall not exceed the amount you paid us in the three (3) months
              immediately preceding the event giving rise to the claim.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">11. Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate your account at any time, with or without notice, if we
              determine you have violated these Terms or if we are required to do so by law. Upon
              termination, your right to access the Service ceases immediately. Wallet balance
              refund eligibility will be assessed on a case-by-case basis.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">12. Changes to These Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to update these Terms at any time. When we make material changes
              we will notify you via email or a prominent notice on the platform. Continued use of
              the Service after such notice constitutes your acceptance of the revised Terms.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">13. Governing Law &amp; Disputes</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with applicable law. Any
              disputes arising from or related to these Terms or the Service shall first be
              attempted to be resolved through good-faith negotiation. If unresolved within 30
              days, disputes shall be submitted to binding arbitration under the applicable
              arbitration rules.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">14. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please open a support ticket through the
              dashboard or contact us at{' '}
              <a
                href="mailto:support@novimp.com"
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                support@novimp.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* CTA footer */}
        <div className="mt-16 rounded-2xl border border-border/60 bg-card/60 p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Ready to get started? Create your account today.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
