import {Middleware} from '../client.ts'

function blob(): Middleware {
	return async (_, next) => {
		const response = await next({ headers: { Accept: `*/*` } })
		return response.status === 204 ? new Blob([]) : response.blob()
	}
}

export default blob