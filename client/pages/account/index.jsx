/* global window */
'use strict';
const App = require('./app.jsx');
const ReactDOM = require('react-dom');

require('../../core/bootstrap.less')
require('../../core/font-awesome.less')
require('./index.less')

class Page {
    static blastoff() {

        this.mainElement = ReactDOM.render(
            App,
            window.document.getElementById('app-mount')
        );
    }
}


module.exports = Page;


/* $lab:coverage:off$ */
if (!module.parent) {
    window.page = Page;
    Page.blastoff();
}
/* $lab:coverage:on$ */
