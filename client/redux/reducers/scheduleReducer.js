const config = {
    timeblocks: [],
    loading: false
}

const scheduleReducer = (state = config, actions) => {
    const {
        response: {
            data: {
                errorKey,
                timeblocks,
            }
        } = {}
    } = actions.payload;

    switch(actions.type){
        /* GET Timeblocks and Schedules */
        case 'GET_SCHEDULES_FULFILLED': {
            state = {
                ...state,
                timeblocks: timeblocks,
                loading: false
            };
            break;
        }
        case 'GET_SCHEDULES_PENDING': {
            state = {
                ...state,
                loading: true
            };
            break;
        }
        case 'GET_SCHEDULES_REJECTED': {
            state = {
                ...state,
                loading: false,
                errorMessage
            };
            break;
        }

        /* CREATE TIMEBLOCK */
        case 'POST_TIMEBLOCK_FULFILLED': {
            state = {
                ...state,
                timeblocks: state.timeblocks.concat(timeblocks),
                loading: false
            };
            break;
        }
        case 'POST_TIMEBLOCK_PENDING': {
            state = {
                ...state,
                loading: true
            };
            break;
        }
        case 'POST_TIMEBLOCK_REJECTED': {
            const {
                response:{
                    data:{
                        errorKey
                    }
                } = {}
            } = actions.payload;

            let errorMessage;

            if(errorKey){
                const errorMessages = {
                    [process.env.SCHEDULE_DATE_UNDEFINED]:'Date is not defined',
                    [process.env.SCHEDULE_START_UNDEFINED]:'Start is not defined',
                    [process.env.SCHEDULE_END_UNDEFINED]:'End is not defined',
                    [process.env.SCHEDULE_AVAILABILITY_UNDEFINED]:'Availability is not defined',
                    [process.env.SCHEDULE_REPEATING_UNDEFINED]:'Repeating is not defined',
                    [process.env.SCHEDULE_START_END_MISMATCH]:'Start time earlier than end time',
                    [process.env.SCHEDULE_DATE_MISMATCH]:'Date selected is earlier than present date'
                };

                errorMessage = errorMessages[errorKey];
            }
            else{
                errorMessage = 'Your availability request could not be processed';
            }

            state = {
                ...state,
                loading: false,
                errorMessage
            };
            break;
        }

        /* DELETE TIMEBLOCK */
        case 'DELETE_TIMEBLOCK_FULFILLED': {
            break;
        }
        case 'DELETE_TIMEBLOCK_PENDING': {
            break;
        }
        case 'DELETE_TIMEBLOCK_REJECTED': {
            break;
        }
    }
    return state;
}

export default scheduleReducer;