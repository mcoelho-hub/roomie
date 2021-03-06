import React from 'react';
import { connect } from 'react-redux';
import { change } from 'redux-form';
import { push } from 'react-router-redux';
import moment from 'moment'
import { Container } from 'semantic-ui-react';

import LeaseForm from '../../components/LeaseForm';
import { submitForm, searchForTenants, addTenant, removeTenant, setSearchValue } from '../../../redux/actions/leaseActions';

import './styles.css';

const Lease = ({
    user,
    errorMessage,
    listing,
    viewListing,
    tenants,
    searchResults,
    searchLoading,
    searchValue,
    onSubmit,
    onCancel,
    onUserRemove,
    formValues,
    onSearchResultSelected,
    onSearchChange,
    startTime,
    endTime,
    startTimeChange,
    endTimeChange
}) => (
    <Container id='leaseContainer' className='rootContainer'> 
        {!user ? (<Redirect to='/sign-in' />) : ''}
        <h1>Create A Lease</h1>
        <LeaseForm
            errorMessage={errorMessage}
            onSubmit={onSubmit}
            onCancel={onCancel}
            user={user}
            listing={listing}
            viewListing={viewListing(listing)}
            tenants={tenants}
            searchResults={searchResults}
            searchLoading={searchLoading}
            onSearchChange={onSearchChange}
            searchValue={searchValue}
            onUserRemove = {onUserRemove}
            onSearchResultSelected={onSearchResultSelected}
            startTimeChange = {startTimeChange}
            endTimeChange = {endTimeChange}
            startTime = {startTime}
            endTime = {endTime}
            formValues = {formValues}
            initialValues = {{
                start: moment().startOf('hour'),
                end: moment().startOf('month').add(1,'month')
            }}
        />
    </Container>
);

const mapStateToProps = ({
    userReducer: {
        user
    } = {},
    leaseReducer: {
        errorMessage,
        listing,
        tenants,
        searchLoading,
        searchResults,
        searchValue
    } = {},
    form: {
        leaseForm: {
            values: formValues
        } = {}
    } = {}
}) => ({
    errorMessage,
    user,
    listing,
    tenants,
    searchLoading,
    searchResults,
    searchValue,
    formValues,
    selectedDate: formValues ? formValues.date:null,
    startTime: formValues ? formValues.start:null,
    endTime: formValues ? formValues.end:null
});

const mapDispatchToProps = (dispatch) => ({
    onSubmit: (formValues, listing, tenants) => () => {
        dispatch(submitForm(formValues, listing, tenants));
        dispatch(push('/my-listings'));
    },
    onCancel: (path) => () => dispatch(push(path)),
    onSearchResultSelected: (e, data) => {
        const {
            result: selectedUser
        } = data;

        dispatch(setSearchValue(''));
        dispatch(addTenant(selectedUser));
    },
    onSearchChange: (e, data) => {
        const {
            value
        } = data;

        dispatch(setSearchValue(value));

        if(value.length >= 3){
            dispatch(searchForTenants(value))
        }
    },
    onUserRemove: (user) => () => {
        dispatch(removeTenant(user))
    },
    startTimeChange: (time) => dispatch(change('leaseForm', 'start', time)),
    endTimeChange: (time) => dispatch(change('leaseForm', 'end', time)),
    viewListing: (listing) => () => dispatch(push(`/listings/${listing._id}`))
});

export default connect(mapStateToProps, mapDispatchToProps)(Lease);
