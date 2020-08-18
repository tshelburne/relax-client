declare module 'relax-client' {
	type Send<T = any> = (path: string, body?: any) => Promise<T>
	type Client = {
		get: Send
		post: Send
		put: Send
		patch: Send
		destroy: Send
	}

	type Request = {
		url: string
		method: keyof Client
		body: string | undefined
	}
	export type Middleware<T = any> = (
		request: Request,
		next: () => Promise<T>
	) => void

	const create: (apiRoot: string, middlewares?: Middleware[]) => Client
	export default create

	export type RequestError = Error
	export const json: () => Middleware
	export const bearerAuth: (name: string) => Middleware
}
