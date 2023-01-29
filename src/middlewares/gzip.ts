import pako from 'pako'
import {Middleware} from '../middleware'

function gzip(): Middleware {
	return ({body}, next) => {
		const compressed = pako.gzip(body as string, {to: 'string'})
		return next({ body: compressed, headers: { 'Content-Encoding': `gzip` } })
	}
}

export default gzip