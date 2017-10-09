'use strict';
const PropTypes = require('prop-types');
const React = require('react');
const ReactRouter = require('react-router-dom');
const Moment = require('moment');


const Link = ReactRouter.Link;
const propTypes = {
    data: PropTypes.array
};


class Results extends React.Component {
    render() {

        console.log(this.props.data)
        const rows = this.props.data.map((record) => {

            return (
                <tr key={record._id}>
                    <td>
                        <Link
                            className="btn btn-default btn-sm"
                            to={`/admin/users/${record._id}`}>

                            Edit
                        </Link>
                    </td>
                    <td>{record.username}</td>
                    <td>{record.email}</td>
                    <td>{record.isActive}</td>
                    <td>{Moment(record.timeCreated).format('MMMM Do YYYY, h:mm:ss a')}</td>
                    <td className="nowrap">{record._id}</td>
                </tr>
            );
        });

        return (
            <div className="table-responsive">
                <table className="table table-striped table-results">
                    <thead>
                        <tr>
                            <th></th>
                            <th>username</th>
                            <th className="stretch">email</th>
                            <th>active</th>
                            <th>created</th>
                            <th>id</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            </div>
        );
    }
}

Results.propTypes = propTypes;


module.exports = Results;
