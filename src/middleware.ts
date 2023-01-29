import deepmerge from 'deepmerge'

export interface Req extends RequestInit {
	url: Request['url']
}

export interface Middleware<In = Response, Out = In> {
	(req: Req, next: (updates?: Partial<Req>) => Promise<In>): Promise<Out>
}

export function compose<T, U, V>(m1: Middleware<T, U>, m2: Middleware<U, V>): Middleware<T, V> {
	return async (req, next) => {
		return m2(req, (u2 = {}) => {
			const req2 = deepmerge(req, u2)
			return m1(req2, (u1 = {}) => {
				const req21 = deepmerge(req2, u1)
				return next(req21)
			})
		})
	}
}
