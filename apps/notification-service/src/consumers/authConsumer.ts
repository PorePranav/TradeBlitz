import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from 'rabbitmq';
import mailGen from '../utils/mailGen';
import { sendEmail } from '../utils/sendEmail';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });

export async function authConsumer() {
  const consumer = rabbitClient.getConsumer();

  await consumer.consume(
    { queueName: 'auth.forgot-password', prefetch: 5, autoAck: false },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const { name, email: emailId, resetToken } = JSON.parse(msg.content.toString());

      const email = {
        body: {
          name: name,
          intro:
            'You have received this email because a password reset was requested for your account.',
          action: {
            instructions: 'Click the button below to reset your password:',
            button: {
              color: '#22BC66',
              text: 'Reset your password',
              link: `https://tradeblitz.pranavpore.com/resetPassword?token=${resetToken}`,
            },
          },
          outro: "If you didn't request a password reset, you can ignore this email.",
        },
      };

      const emailBody = mailGen.generate(email);

      try {
        await sendEmail({ to: emailId, subject: 'Password Reset', emailBody });
        consumer.ack(msg);
      } catch (err) {
        console.log(err);
      }
    }
  );

  await consumer.consume(
    {
      exchangeName: 'auth.signup.fanout',
      exchangeType: ExchangeType.FANOUT,
      queueName: 'auth.signup',
      autoAck: false,
    },
    async (msg) => {
      if (msg) {
        const { name, email: emailId, verificationToken } = JSON.parse(msg.content.toString());
        const email = {
          body: {
            name,
            intro: 'Welcome to TradeBlitz!',
            action: {
              instructions: 'Click on the button below to verify your account',
              button: {
                color: '#22BC66',
                text: 'Verify Your Account',
                link: `https://tradeblitz.pranavpore.com/verifyUser?token=${verificationToken}`,
              },
            },
            outro: 'If you have any questions, feel free to reach out to our support team.',
          },
        };

        const emailBody = mailGen.generate(email);

        try {
          await sendEmail({ to: emailId, subject: 'Welcome to TradeBlitz', emailBody });
          consumer.ack(msg);
        } catch (err) {
          console.log(err);
        }
      }
    }
  );
}
