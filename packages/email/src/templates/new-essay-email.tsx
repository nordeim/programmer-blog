/**
 * packages/email/src/templates/new-essay-email.tsx — FR-51.
 *
 * React Email template sent when a new essay is published to
 * confirmed subscribers.
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

interface NewEssayEmailProps {
  postTitle: string;
  postExcerpt: string;
  postUrl: string;
  unsubscribeUrl: string;
  readingTimeMinutes: number;
}

export const NewEssayEmail: React.FC<NewEssayEmailProps> = ({
  postTitle,
  postExcerpt,
  postUrl,
  unsubscribeUrl,
  readingTimeMinutes,
}) => {
  return (
    <Html lang="en" data-theme="dark">
      <Head />
      <Preview>new on /dev/log: {postTitle}</Preview>
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
              fontSize: '16px',
              letterSpacing: '-0.01em',
              margin: '0 0 8px 0',
              color: '#7dd3fc',
            }}
          >
            {'//'} /dev/log · new essay
          </Heading>
          <Heading
            style={{
              fontSize: '26px',
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0',
              color: '#e4e4e7',
              lineHeight: '1.2',
            }}
          >
            {postTitle}
          </Heading>
          <Text
            style={{
              fontSize: '12px',
              color: '#71717a',
              margin: '0 0 24px 0',
            }}
          >
            {readingTimeMinutes} min read
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#a1a1aa' }}>
            {postExcerpt}
          </Text>
          <Section style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
            <Button
              href={postUrl}
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
              read on /dev/log →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#2a2a35', margin: '24px 0' }} />
          <Text style={{ fontSize: '11px', lineHeight: '1.6', color: '#52525b' }}>
            you&apos;re receiving this because you confirmed your subscription to /dev/log.{' '}
            <a href={unsubscribeUrl} style={{ color: '#7dd3fc' }}>
              unsubscribe
            </a>{' '}
            any time.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
