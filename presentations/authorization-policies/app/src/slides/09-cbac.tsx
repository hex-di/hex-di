import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";
import { CodeBlock } from "../components/code-block";
import { ModelCard } from "../components/model-card";
import { PolicyFlow } from "../components/policy-flow";
import { HudCard } from "../components/hud-card";
import { colors } from "../theme/colors";

export function CbacSlide(): ReactNode {
  return (
    <Section
      id="cbac"
      number={9}
      label="Role & Attribute"
      title="Claims-Based Access Control (CBAC)"
    >
      <Animate variant="fade-up" delay={100}>
        <p className="text-lg text-auth-muted mb-6 max-w-3xl">
          Access decisions based on claims embedded in security tokens (JWT, SAML). A trusted
          identity provider asserts claims, and the relying party decides based on those claims.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <div className="mb-6">
          <PolicyFlow
            steps={[
              { label: "User", color: colors.text },
              { label: "Auth Server", sublabel: "IdP", color: colors.primary },
              { label: "JWT Token", sublabel: "Claims", color: colors.accent },
              { label: "Resource", sublabel: "Validates", color: colors.green },
            ]}
          />
        </div>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="slide-left" delay={300}>
          <CodeBlock title="jwt-claims.json">
            <span className="syn-bracket">{"{"}</span>
            {"\n"}
            {"  "}
            <span className="syn-string">&quot;sub&quot;</span>:{" "}
            <span className="syn-string">&quot;alice@example.com&quot;</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;roles&quot;</span>:{" "}
            <span className="syn-bracket">[</span>
            <span className="syn-string">&quot;editor&quot;</span>,{" "}
            <span className="syn-string">&quot;reviewer&quot;</span>
            <span className="syn-bracket">]</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;department&quot;</span>:{" "}
            <span className="syn-string">&quot;engineering&quot;</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;clearance&quot;</span>:{" "}
            <span className="syn-string">&quot;confidential&quot;</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;org_id&quot;</span>:{" "}
            <span className="syn-string">&quot;acme-corp&quot;</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;iss&quot;</span>:{" "}
            <span className="syn-string">&quot;https://auth.example.com&quot;</span>,{"\n"}
            {"  "}
            <span className="syn-string">&quot;exp&quot;</span>:{" "}
            <span className="syn-number">1700000000</span>
            {"\n"}
            <span className="syn-bracket">{"}"}</span>
          </CodeBlock>
        </Animate>

        <Animate variant="slide-right" delay={400}>
          <div className="space-y-4">
            <HudCard variant="pink">
              <h3 className="font-display font-semibold text-lg text-auth-pink mb-3">
                Real-World Examples
              </h3>
              <ul className="space-y-2 text-sm text-auth-text/70">
                <li>
                  <span className="text-auth-pink font-mono">Azure AD</span> — Custom claims in JWT
                  tokens
                </li>
                <li>
                  <span className="text-auth-pink font-mono">Auth0</span> — Claims-based
                  authorization rules
                </li>
                <li>
                  <span className="text-auth-pink font-mono">AWS Cognito</span> — User pool custom
                  attributes
                </li>
                <li>
                  <span className="text-auth-pink font-mono">Keycloak</span> — OIDC tokens with org
                  claims
                </li>
              </ul>
            </HudCard>
          </div>
        </Animate>
      </div>

      <Animate variant="fade-up" delay={500}>
        <ModelCard
          name="CBAC"
          icon="&#127915;"
          variant="pink"
          strengths={[
            "Stateless — claims travel with the request",
            "Federated — works across org boundaries",
            "Standard protocols (OAuth2, OIDC, SAML)",
            "Rich ecosystem (Auth0, Okta, Keycloak)",
          ]}
          weaknesses={[
            "Token revocation is difficult",
            "Claim bloat impacts performance",
            "Claims are fixed at issuance (stale until refresh)",
            "Limited to what IdP can assert",
          ]}
        />
      </Animate>
    </Section>
  );
}
