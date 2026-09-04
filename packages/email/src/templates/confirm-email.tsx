/**
 * packages/email/src/templates/confirm-email.tsx — FR-50.
 *
 * React Email template sent when a new subscriber signs up. Branded
 * to match the /dev/log CLI aesthetic: monospace, dark theme,
 * confirm-button linking to /api/confirm?token=...
 *
 * Per PAD §4.3 ADR-007.
 */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ConfirmEmailProps {
  email: string;
  confirmUrl: string;
  unsubscribeUrl: string;
}

export const ConfirmEmail: React.FC<ConfirmEmailProps> = ({
  email,
  confirmUrl,
  unsubscribeUrl,
}) => {
  return (
    <Html lang="en" data-theme="dark">
      <Head />
      <Preview>Confirm your subscription to /dev/log</Preview>
      <Body
        style={{
          backgroundColor: '#0a0a0f',
          color: '#e4e4e7',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          padding: '24px',
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: '#15151a',
            border: '1px solid #2a2a35',
            borderRadius: '4px',
            padding: '32px',
          }}
        >
          <Heading
            style={{
              fontSize: '24px',
              letterSpacing: '-0.02em',
              margin: '0 0 24px 0',
              color: '#7dd3fc',
            }}
          >
            $ confirm your subscription
          </Heading>
          <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#a1a1aa' }}>
            you (or someone pretending to be you) signed up for the /dev/log
            dispatch with this email address:
          </Text>
          <Text
            style={{
              fontSize: '13px',
              fontFamily: 'ui-monospace, monospace',
              padding: '12px',
              border: '1px solid #2a2a35',
              backgroundColor: '#0a0a0f',
              margin: '16px 0',
              color: '#e4e4e7',
            }}
          >
            {email}
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#a1a1aa' }}>
            click the button below to confirm. the link expires in 7 days.
          </Text>
          <Section style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
            <Button
              href={confirmUrl}
              style={{
                backgroundColor: '#7dd3fc',
                color: '#0a0a0f',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '13px',
                fontWeight: 700,
                padding: '12px 24px',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              confirm subscription →
            </Button>
          </Section>
          <Text style={{ fontSize: '12px', lineHeight: '1.6', color: '#71717a' }}>
            or paste this URL into your browser:
          </Text>
          <Text
            style={{
              fontSize: '11px',
              fontFamily: 'ui-monospace, monospace',
              padding: '8px',
              border: '1px solid #2a2a35',
              backgroundColor: '#0a0a0f',
              wordBreak: 'break-all',
              margin: '8px 0 24px 0',
              color: '#a1a1aa',
            }}
          >
            {confirmUrl}
          </Text>
          <Hr style={{ borderColor: '#2a2a35', margin: '24px 0' }} />
          <Text style={{ fontSize: '11px', lineHeight: '1.6', color: '#52525b' }}>
            didn&apos;t sign up? ignore this email.{' '}
            <Link href={unsubscribeUrl} style={{ color: '#7dd3fc' }}>
              unsubscribe
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
