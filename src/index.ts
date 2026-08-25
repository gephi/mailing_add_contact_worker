/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { CreateContactOptions, Resend } from 'resend';

interface Env {
	RESEND_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Vérification de la méthode HTTP
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {
			// Parsing et validation du JSON
			const bodyJson: Record<string, unknown> = await request.json();
			if (!bodyJson.email || typeof bodyJson.email !== 'string') {
				return new Response(JSON.stringify({ success: false, error: 'Email manquant ou invalide' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			// Cast explicite pour TypeScript (à faire après validation)
			const payload: CreateContactOptions = bodyJson as unknown as CreateContactOptions;

			const resend = new Resend(env.RESEND_API_KEY);

			const { error } = await resend.contacts.create({ email: payload.email });

			if (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'Erreur interne du serveur ou corps invalide',
					}),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			} else {
				// send Welcome message through event/automation
				await resend.events.send({
					event: 'contact.created',
					email: payload.email,
				});
				return new Response(null, {
					status: 201,
				});
			}
		} catch (error) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Erreur interne du serveur ou corps invalide',
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}
	},
} satisfies ExportedHandler<Env>;
