import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "./terms";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Body Forge" }] }),
  component: Privacy,
});

// NOTE FOR THE OWNER: template for a consumer AI fitness app — have counsel
// review before launch and replace the bracketed placeholders.

function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 22, 2026">
      <H>What we collect</H>
      <P>
        Account details (name, email); the fitness profile you provide (age, goals, experience,
        equipment, injuries, dietary preferences and allergies, height and weight); activity you log
        (workouts, sets, weigh-ins, meals, check-ins); photos and videos you choose to upload for
        meal, body, or form analysis; your messages with the AI coach; subscription status; and
        basic technical data needed to run the app.
      </P>

      <H>How we use it</H>
      <P>
        To run your coaching experience: building and adapting your program, calculating nutrition
        targets, analyzing uploads you submit, remembering context so the coach knows you, sending
        the reminders you turn on, and processing payments. We do not sell your personal data, and
        we do not use your health information for third-party advertising.
      </P>

      <H>Who processes it for us</H>
      <P>
        Supabase hosts our database and authentication. Stripe processes payments (we never see your
        full card number). AI providers process the content needed to generate coaching responses
        and analyze uploads you submit. Each processes data only to provide their service to us.
      </P>

      <H>Your health data, specifically</H>
      <P>
        Injuries, body metrics, photos, and videos are sensitive. They are used solely to
        personalize your coaching, are protected by per-user access rules at the database level, and
        are never shared for marketing.
      </P>

      <H>Your controls</H>
      <P>
        You can edit your profile anytime, export what you have logged by contacting support, and
        permanently delete your account and all associated data from Profile → Delete account.
        Deletion is immediate and irreversible.
      </P>

      <H>Retention and security</H>
      <P>
        We keep your data while your account exists and delete it when you delete your account. Data
        is encrypted in transit, and access is restricted by row-level security so only your
        authenticated account can read your records.
      </P>

      <H>Children</H>
      <P>
        The Service is not directed to children under 16, and we do not knowingly collect their
        data.
      </P>

      <H>Changes and contact</H>
      <P>
        We will notify you of material changes to this policy in the app or by email. Questions or
        requests: support@bodyforge.app (replace with your support address). [YOUR BUSINESS NAME],
        [JURISDICTION].
      </P>
    </LegalShell>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 mb-1.5 text-base font-bold">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
