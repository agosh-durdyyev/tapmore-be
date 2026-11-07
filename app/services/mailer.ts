import logger from '@adonisjs/core/services/logger'

export class MailerError extends Error {}

export interface Mailer {
  sendLoginCode(email: string, code: string): Promise<void>
}

/**
 * Sends sign-in codes through Resend (https://resend.com) using its HTTP API.
 * The subject line carries the code so phones can offer it as autofill.
 */
export class ResendMailer implements Mailer {
  constructor(
    private apiKey: string,
    private from: string,
    private transport: typeof fetch = fetch
  ) {}

  async sendLoginCode(email: string, code: string) {
    let response: Response
    try {
      response = await this.transport('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [email],
          subject: `${code} is your TapMore code`,
          text: [
            `Your TapMore sign-in code is ${code}.`,
            '',
            'It expires in 10 minutes. If you didn’t ask for it, you can ignore this email.',
          ].join('\n'),
        }),
        signal: AbortSignal.timeout(10000),
      })
    } catch {
      throw new MailerError('Email provider unavailable')
    }
    if (!response.ok) throw new MailerError('Email provider rejected the message')
  }
}

/** Development fallback: prints the code to the server log instead of emailing it. */
export class LogMailer implements Mailer {
  async sendLoginCode(email: string, code: string) {
    logger.info({ email }, `TapMore sign-in code for ${email}: ${code}`)
  }
}
