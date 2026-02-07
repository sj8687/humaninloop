import readline from 'node:readline/promises';
import * as z from 'zod';
import { createAgent, tool, humanInTheLoopMiddleware } from 'langchain';
import { ChatGroq } from '@langchain/groq';
import { MemorySaver, Command } from '@langchain/langgraph';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

const gmailEmails = {
  messages: [
    {
      id: '18c3f2a1b5d6e789',
      threadId: '18c3f2a1b5d6e789',
      labelIds: ['INBOX', 'UNREAD'],
      snippet:
        "Hi, I purchased your JavaScript masterclass course last week but I would like to request a refund. The course content doesn't match what was advertised...",
      payload: {
        headers: [
          { name: 'From', value: 'john.doe@example.com' },
          { name: 'To', value: 'support@codersgyan.com' },
          { name: 'Subject', value: 'Refund Request - JavaScript Course' },
          { name: 'Date', value: 'Mon, 4 Nov 2024 10:30:00 +0000' },
        ],
        body: {
          data: 'SGksIEkgcHVyY2hhc2VkIHlvdXIgSmF2YVNjcmlwdCBtYXN0ZXJjbGFzcyBjb3Vyc2UgbGFzdCB3ZWVrIGJ1dCBJIHdvdWxkIGxpa2UgdG8gcmVxdWVzdCBhIHJlZnVuZC4gVGhlIGNvdXJzZSBjb250ZW50IGRvZXNuJ3QgbWF0Y2ggd2hhdCB3YXMgYWR2ZXJ0aXNlZC4=',
        },
      },
      internalDate: '1730715000000',
    },
    {
      id: '18c3e8f9a2c4b567',
      threadId: '18c3e8f9a2c4b567',
      labelIds: ['INBOX'],
      snippet:
        'Thank you for your recent purchase! Your order #CR-2024-1543 has been confirmed. We hope you enjoy the React Advanced Patterns course...',
      payload: {
        headers: [
          { name: 'From', value: 'noreply@codersgyan.com' },
          { name: 'To', value: 'sarah.williams@example.com' },
          { name: 'Subject', value: 'Order Confirmation - React Course' },
          { name: 'Date', value: 'Sun, 3 Nov 2024 14:20:00 +0000' },
        ],
        body: {
          data: 'VGhhbmsgeW91IGZvciB5b3VyIHJlY2VudCBwdXJjaGFzZSEgWW91ciBvcmRlciAjQ1ItMjAyNC0xNTQzIGhhcyBiZWVuIGNvbmZpcm1lZC4=',
        },
      },
      internalDate: '1730642400000',
    },
    {
      id: '18c3d5b8e1f3a456',
      threadId: '18c3d5b8e1f3a456',
      labelIds: ['INBOX', 'UNREAD'],
      snippet:
        "Hello Codersgyan team, I need to request a refund for the Full Stack course I bought 3 days ago. I'm facing some financial difficulties and cannot continue...",
      payload: {
        headers: [
          { name: 'From', value: 'mike.chen@example.com' },
          { name: 'To', value: 'support@codersgyan.com' },
          { name: 'Subject', value: 'Course Refund Request - Order #CR-2024-1538' },
          { name: 'Date', value: 'Sat, 2 Nov 2024 09:15:00 +0000' },
        ],
        body: {
          data: 'SGVsbG8gQ29kZXJzZ3lhbiB0ZWFtLCBJIG5lZWQgdG8gcmVxdWVzdCBhIHJlZnVuZCBmb3IgdGhlIEZ1bGwgU3RhY2sgY291cnNlIEkgYm91Z2h0IDMgZGF5cyBhZ28u',
        },
      },
      internalDate: '1730538900000',
    },
    {
      id: '18c3c2a7d0e2b345',
      threadId: '18c3c2a7d0e2b345',
      labelIds: ['INBOX', 'IMPORTANT'],
      snippet:
        "Weekly newsletter: New course announcement! We're excited to launch our new Node.js microservices course. Early bird discount available...",
      payload: {
        headers: [
          { name: 'From', value: 'newsletter@codersgyan.com' },
          { name: 'To', value: 'subscribers@codersgyan.com' },
          { name: 'Subject', value: '🚀 New Course Launch - Node.js Microservices' },
          { name: 'Date', value: 'Fri, 1 Nov 2024 08:00:00 +0000' },
        ],
        body: {
          data: 'V2Vla2x5IG5ld3NsZXR0ZXI6IE5ldyBjb3Vyc2UgYW5ub3VuY2VtZW50ISBXZSdyZSBleGNpdGVkIHRvIGxhdW5jaCBvdXIgbmV3IE5vZGUuanMgbWljcm9zZXJ2aWNlcyBjb3Vyc2Uu',
        },
      },
      internalDate: '1730448000000',
    },
    {
      id: '18c3b1c6f9d1a234',
      threadId: '18c3b1c6f9d1a234',
      labelIds: ['INBOX'],
      snippet:
        'Hi there! I have a question about the Python course. Can you tell me if it covers Django framework? Thanks!',
      payload: {
        headers: [
          { name: 'From', value: 'emma.taylor@example.com' },
          { name: 'To', value: 'support@codersgyan.com' },
          { name: 'Subject', value: 'Question about Python Course Content' },
          { name: 'Date', value: 'Thu, 31 Oct 2024 16:45:00 +0000' },
        ],
        body: {
          data: 'SGkgdGhlcmUhIEkgaGF2ZSBhIHF1ZXN0aW9uIGFib3V0IHRoZSBQeXRob24gY291cnNlLiBDYW4geW91IHRlbGwgbWUgaWYgaXQgY292ZXJzIERqYW5nbyBmcmFtZXdvcms/',
        },
      },
      internalDate: '1730393100000',
    },
  ],
  resultSizeEstimate: 5,
};

const llm = new ChatGroq({
  apiKey: "",  
  model: 'openai/gpt-oss-120b',
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
});

const getEmails = tool(
  () => {

    return JSON.stringify(gmailEmails);
  },
  {
    name: 'get_emails',
    description: 'Get the emails from inbox.',
  }
);

const refund = tool(
  ({ emails }) => {

    return 'All refunds processed succesfully!';
  },
  {
    name: 'refund',
    description: 'Process the refund for given emails.',
    schema: z.object({
      emails: z.array(z.string()).describe('The list of the emails which need to be refunded'),
    }),
  }
);

const agent = createAgent({
  model: llm,
  tools: [getEmails, refund],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: { refund: true },
      descriptionPrefix: 'Refund pending approval',
    }),
  ],
  checkpointer: new MemorySaver(),
});

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let interrupts = [];

  while (true) {
    const query = await rl.question('You: ');
    if (query === '/bye') break;

    const response = await agent.invoke(
      interrupts.length
        ? new Command({
            resume: {
              [interrupts?.[0]?.id]: {
                decisions: [{ type: query === '1' ? 'approvee' : 'reject' }],
              },
            },
          })
        : {
            messages: [
              {
                role: 'user',
                content: query,
              },
            ],
          },
      { configurable: { thread_id: '1' } }
    );

    interrupts = [];

    const formatted = marked.setOptions({
      renderer: new TerminalRenderer(),
    });

    let output = '';

    if (response?.__interrupt__?.length) {
      interrupts.push(response.__interrupt__[0]);

      output += response.__interrupt__[0].value.actionRequests[0].description + '\n\n';
      output += 'Choose:\n';

      output += response.__interrupt__[0].value.reviewConfigs[0].allowedDecisions
        .filter((decision) => decision !== 'edit')
        .map((decision, idx) => `${idx + 1}. ${decision}`)
        .join('\n');
    } else {
      output += response.messages[response.messages.length - 1].content;
    }

    console.log(formatted(output));
  }

  rl.close();
}

main();