import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Container, Button, Item, Icon, Image, Label, Message, Loader, Dimmer} from 'semantic-ui-react';
import { push } from 'react-router-redux'; // TODO: Should probably use nagivateTo in components but there was wierd transpiling issues
import { arrayPush, arrayRemove } from 'redux-form';

import ListingForm from '../../components/ListingForm';
import ListingDisplay from '../../components/ListingDisplay';
import MapComponent from '../../components/Map';
import { addLandlord, setListing } from '../../../redux/actions/scheduleMeetingActions';
import { navigateTo } from '../../../components';
import { createChannelWithUser } from '../../../redux/actions/chatActions';
import {
    getListingById,
    editListing,
    submitUpdateForm,
    cancelEditListing
} from '../../../redux/actions/listingActions';

import './styles.css';

@connect(({
    listingReducer: {
        listing,
        isEditing,
        isFormProcessing,
        errorMessage,
        analyticsMessage,
        isLoading
    } = {},
    userReducer: {
        user
    } = {},
    form: {
        listingForm: {
            values
        } = {}
    } = {}
}) => ({
    listing,
    user,
    formData: values,
    isEditing,
    isFormProcessing,
    errorMessage,
    analyticsMessage,
    isLoading
}))

export default class Listing extends React.Component {
    constructor(props) {
        super(props);

        this.listingId = this.props.match.params.id;
        this.editListing = this.editListing.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        this.onImageDrop = this.onImageDrop.bind(this);
        this.onImageRemove = this.onImageRemove.bind(this);
        this.onEditCancelClicked = this.onEditCancelClicked.bind(this);
        this.onBookMeetingClicked = this.onBookMeetingClicked.bind(this);
        this.createChatWithLandlord = this.createChatWithLandlord.bind(this);
    }

    componentWillMount() {
        this.props.dispatch(getListingById(this.listingId));
    }

    editListing() {
        this.props.dispatch(editListing());
    }

    onSubmit(formData) {
        this.props.dispatch(submitUpdateForm(formData, this.listingId));
    }

    onEditCancelClicked() {
        this.props.dispatch(cancelEditListing());
    }

    onBookMeetingClicked(listing) {
        if (listing) {
            return () => {
                this.props.dispatch(addLandlord(listing.owner));
                this.props.dispatch(setListing(listing));
                this.props.dispatch(push('/schedule-meeting'));
            }
        } else {
            return () => this.props.dispatch(push('/schedule-meeting'));
        }
    }

    onImageDrop(images) {
        images.forEach((image) => this.props.dispatch(arrayPush('listingForm', 'images', image)));
    }

    onImageRemove(imageIndex) {
        this.props.dispatch(arrayRemove('listingForm', 'images', imageIndex));
    }

    createChatWithLandlord(landlord){
        this.props.dispatch(createChannelWithUser(this.props.user.name + ' + ' +landlord.name,landlord));
        navigateTo(this.props.dispatch)('/chat');
    }

    render() {
        const {
            listing,
            user,
            isEditing,
            isFormProcessing,
            errorMessage,
            formData,
            analyticsMessage,
            isLoading
        } = this.props;
        let editButton;

        editButton = (user && listing && user.isLandlord && user._id === listing.ownerId && !isEditing) ? (
            <Button className='primaryColour' onClick={ this.editListing }>Edit listing</Button>
        ) : ('');

        let startChatButton;
        startChatButton = (user && !user.isLandlord) ? (
            <Button color='green' onClick={()=>this.createChatWithLandlord(listing.owner)}>Message Landlord</Button>
        ) : ('');

        let meetingButton = (user && listing && !isEditing) ? (
            <Button className='primaryColour' onClick={this.onBookMeetingClicked(listing)}>Book a Meeting</Button>
        ) : ('');

        let message;

        message = analyticsMessage ? (
            <Message warning>
                <div dangerouslySetInnerHTML = {{ __html: analyticsMessage }}></div>
            </Message>
        ) : ('');

        let bodySection;


        if (isEditing && listing) {
            bodySection = (
                <div>
                    <h1>Edit Listing</h1>
                    <h2>{listing.location}</h2>
                    <ListingForm
                        onSubmit={(formData) => () => this.onSubmit(formData)}
                        onEditCancelClicked={ this.onEditCancelClicked }
                        initialValues={{ ...listing }}
                        isProcessing={ isFormProcessing }
                        errorMessage={ errorMessage }
                        onImageDrop={(images) => this.onImageDrop(images)}
                        onImageRemove={(imageIndex) => () => this.onImageRemove(imageIndex)}
                        formData={formData}
                    />
                </div>
            );
        } else if (listing) {
            bodySection = isLoading ?
            (
                <Dimmer active>
                    <Loader>Loading</Loader>
                </Dimmer>
            ) : 
            (
                <div>
                    <ListingDisplay
                        listing= { listing }
                        message= { message }
                    />
                    {editButton}
                    {meetingButton}
                    {startChatButton}
                    <div id='mapsComponentWrapper'>
                        <MapComponent position={{lat: this.props.listing.lat, lng: this.props.listing.lng}} />
                    </div>
                </div>
            );
        } else {
            bodySection = '';
        }

        return (
            <Container id='listingContainer' className='rootContainer'>
                {bodySection}
            </Container>
        )
    }
}
