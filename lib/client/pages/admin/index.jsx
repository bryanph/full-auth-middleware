/* global window */
'use strict';
const ReactDOM = require('react-dom');
const App = require('./app.jsx');

require('../../core/bootstrap.less')
require('../../core/font-awesome.less')
require('./index.less')

const Page = {
    blastoff: function () {

        this.mainElement = ReactDOM.render(
            App,
            window.document.getElementById('app-mount')
        );
    }
};


module.exports = Page;


/* $lab:coverage:off$ */
if (!module.parent) {
    window.page = Page;
    Page.blastoff();
}
/* $lab:coverage:on$ */
