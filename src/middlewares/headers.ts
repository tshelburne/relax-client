import { Middleware } from "../middleware"

function headers(key: string, value: string): Middleware
function headers(headers: { [key: string]: string }): Middleware
function headers(
	keyOrHeaders: string | { [key: string]: string },
	value?: string
): Middleware {
	return (_, next) =>
		next({
			headers:
				typeof keyOrHeaders === "string"
					? { [keyOrHeaders]: value! }
					: keyOrHeaders,
		})
}

export default headers
