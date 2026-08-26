/**
 * packages/email/src/templates/unsubscribe-confirmation.tsx — FR-31.
 *
 * React Email template sent when a subscriber clicks the unsubscribe
 * link. Confirms they have been removed from the list.
 */
import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface UnsubscribeConfirmationProps {
  email: string;
  resubscribeUrl: string;
}

export const UnsubscribeConfirmation: React.FC<UnsubscribeConfirmationProps> = ({
  email,
  resubscribeUrl,
}) => {
  return (
    <Html lang="en" data-theme="dark">
      <Head />
      <Preview>you&apos;ve unsubscribed from /dev/log</Preview>
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
            $ you&apos;re unsubscribed
          </Heading>
          <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#a1a1aa' }}>
            {email} has been removed from the /dev/log dispatch. you won&apos;t
            receive any more emails from us unless you resubscribe.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#a1a1aa' }}>
            changed your mind?
          </Text>
          <Section style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
            <Button
              href={resubscribeUrl}
              style={{
                backgroundColor: 'transparent',
                color: '#7dd3fc',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '13px',
                fontWeight: 700,
                padding: '12px 24px',
                borderRadius: '4px',
                border: '1px solid #7dd3fc',
                textDecoration: 'none',
              }}
            >
              resubscribe →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#2a2a35', margin: '24px 0' }} />
          <Text style={{ fontSize: '11px', lineHeight: '1.6', color: '#52525b' }}>
            farewell. the door is always open.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
