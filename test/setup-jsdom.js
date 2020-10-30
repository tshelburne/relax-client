import jsdom from 'jsdom-global'

before(function() {
	const originalFormData = FormData
	this.jsdom =  new jsdom(``, {
		url: "https://test.com/",
	})
	FormData = originalFormData
})

after(function() {
	this.jsdom = jsdom
})
