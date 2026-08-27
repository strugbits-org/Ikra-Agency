/**
 * Forwards a waitlist submission to the Wix form the client built in their Wix dashboard, via
 * Wix's Forms API, so it lands in their Wix submissions inbox like a native submission would.
 *
 * Two calls, because the client ID alone only proves the request is coming from this site's
 * headless app — it isn't itself a bearer credential: first trade it for a short-lived visitor
 * access token (the same identity an anonymous visitor on the Wix site would get), then use that
 * token to create the submission. No client secret and no site ID are needed for either call —
 * the client ID is already scoped to one site because it's created inside that site's own
 * Headless Settings.
 */

const WIX_FIELD_TARGETS = {
  name: "first_name_abf7",
  email: "email_1b5c",
  company: "company_name_3bef",
} as const;

export async function POST(request: Request) {
  const clientId = process.env.WIX_OAUTH_CLIENT_ID;
  const formId = process.env.WIX_FORM_ID;

  if (!clientId || !formId) {
    console.error("[waitlist] missing WIX_OAUTH_CLIENT_ID or WIX_FORM_ID");
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { name, email, company } = body as Record<string, unknown>;

  if (typeof email !== "string" || !email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const tokenRes = await fetch("https://www.wixapis.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, grantType: "anonymous" }),
  });

  if (!tokenRes.ok) {
    console.error("[waitlist] token exchange failed", await tokenRes.text());
    return Response.json({ error: "Could not reach Wix" }, { status: 502 });
  }

  const { access_token: accessToken } = await tokenRes.json();

  const submissionRes = await fetch("https://www.wixapis.com/forms/v4/submissions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify({
      submission: {
        formId,
        submissions: {
          [WIX_FIELD_TARGETS.name]: typeof name === "string" ? name : "",
          [WIX_FIELD_TARGETS.email]: email,
          [WIX_FIELD_TARGETS.company]: typeof company === "string" ? company : "",
        },
      },
    }),
  });

  if (!submissionRes.ok) {
    console.error("[waitlist] submission failed", await submissionRes.text());
    return Response.json({ error: "Could not submit form" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
