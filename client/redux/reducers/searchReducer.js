const config ={
    listings: [],
    location: '',
    fulfilled: false,
    pending: false,
    rejected: false,
}

const searchReducer = (state = config, actions) => {
    switch(actions.type){
        case 'LOCATION_CHANGE': {
            state = {
                ...state, 
                location: actions.payload.val
            };
            break;
        }

        case 'GET_SEARCH_RESULTS_FULFILLED': {
            state = {
                ...state, 
                listings: state.listings.concat(actions.payload.data.listings),
                fulfilled: true,
                pending: false,
                rejected: false
            };
            break;
        }

        case 'GET_SEARCH_RESULTS_PENDING': {
            state = {
                ...state, 
                listings: [],
                fulfilled: false,
                pending: true,
                rejected: false
            };
            break;
        }

        case 'GET_SEARCH_RESULTS_REJECTED': {
            state = {
                ...state, 
                listings: [],
                fulfilled: false,
                pending: false,
                rejected: true
            };
            break;
        }
        //TODO: Fix up copy pasta code for future reducer actions
        case 'GET_POPULAR_LISTINGS_FULFILLED': {
            state = {
                ...state, 
                listings: state.listings.concat(actions.payload.data.listings),
                fulfilled: true,
                pending: false,
                rejected: false
            };
            break;
        }

        case 'GET_POPULAR_LISTINGS_PENDING': {
            state = {
                ...state, 
                listings: [],
                fulfilled: false,
                pending: true,
                rejected: false
            };
            break;
        }

        case 'GET_POPULAR_LISTINGS_REJECTED': {
            state = {
                ...state, 
                listings: [],
                fulfilled: false,
                pending: false,
                rejected: true
            };
            break;
        }
    }
    return state;
}

export default searchReducer;