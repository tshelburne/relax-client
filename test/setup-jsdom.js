import jsdom from 'jsdom-global'

before(function() {
	// this looks dumb. it is dumb. but it is what allows isomorphic-form-data to provide FormData for our tests
	const originalFormData = FormData
	this.jsdom =  new jsdom(``, {
		url: "https://test.com/",
	})
	FormData = originalFormData
})

after(function() {
	this.jsdom = jsdom
})
