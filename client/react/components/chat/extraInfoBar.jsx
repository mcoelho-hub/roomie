import React, {Component} from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import {Button, Container, Menu, Icon,Search } from 'semantic-ui-react';

const InviteSearch = ({
    isAdmin,
    searchResults,
    searchLoading,
    searchOnSelect,
    searchOnChange,
    inviteUser
})=>{
    if(isAdmin){
        return(
            <div>
                Invite User:
                <Search
                    fluid
                    results={searchResults}
                    loading={searchLoading}
                    onResultSelect={searchOnSelect}
                    onSearchChange={searchOnChange}
                />
                <Button onClick={inviteUser}>Invite</Button>
            </div>
        )
    }
    return;
}

const listUsers = ({
    users
}) => {
    if(users){
        return Object.values(users).map((element,i) => {
            if(element.isActive){
                return (
                    <Menu.Item key={i} >{element.name}</Menu.Item>
                )
            }
            return ;
        });
    }
}

const ExtraInfoBar = ({
    users,
    isAdmin,
    searchResults,
    searchLoading,
    searchOnSelect,
    searchOnChange,
    inviteUser
}) => (
    <Container>
        <Menu float='right' vertical inverted fluid>
            <Menu.Item header>User Information</Menu.Item>
            {listUsers({users})}
            <Menu.Item key={users.size}>{InviteSearch({isAdmin,searchResults,searchLoading,searchOnSelect,searchOnChange,inviteUser})}</Menu.Item>

        </Menu>
    </Container>
);

export default ExtraInfoBar;
