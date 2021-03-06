import faker from 'faker';
import moment from 'moment';
import { GCM } from 'node-crypto-gcm';
import axios from 'axios';

import {
    required,
    print,
    convertToObjectId,
    RethrownError,
    getUniqueHash,
    convertToNumber
} from '../custom-utils';

import { insert as insertInDb } from '../db/service';
import { findAndUpdate } from '../db/service';
import { generateHash as hashPassword } from '../authentication';
import { roommateSurvey as surveyContants, userTypes } from '../../../common/constants';

export const getListingsByOwner = async({
    listingsCollection = required('listingsCollection'),
    ownerId = required('ownerId')
}) => {
    try {
        return await listingsCollection.find({
            ownerId: convertToObjectId(ownerId),
            isCurrentlyLeased: false
        }).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error getting a listing with owner ${ownerId}`);
    }
};

export const getLeasesByOwner = async({
    leasesCollection = required('leasesCollection'),
    ownerId = required('ownerId')
}) => {
    try {
        return await leasesCollection.find({
            ownerId: convertToObjectId(ownerId)
        }).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error getting a leases with owner ${ownerId}`);
    }
};

// Get listings based on an optional query
export const findListings = async({
    listingsCollection = required('listingsCollection'),
    query
}) => {
    const {
        bathrooms,
        bedrooms,
        furnished,
        keywords,
        maxPrice,
        minPrice,
        location = '',
        ownerId,
        type,
        utilities,
        parking,
        internet,
        laundry,
        ac
    } = query;

    //Generate query
    const aggregationOperator = [
    ];

    let filter = {};
    if(minPrice){
        filter.price = {
            $gte: convertToNumber(minPrice)
        }
    }

    if(maxPrice){
        filter.price = {
            ...filter.price,
            $lte: convertToNumber(maxPrice)
        }
    }

    let orArgs = [];
    if(bathrooms){
        const bathroomArray = bathrooms.split(',').map(item => ({'bathrooms':item}));
        orArgs = orArgs.concat(bathroomArray);
    }

    if(bedrooms){
        const bedroomArray = bedrooms.split(',').map(item => ({bedrooms:item}));
        orArgs = orArgs.concat(bedroomArray);
    }

    if(type){
        const typeArray = type.split(',').map(item => ({type:item}));
        orArgs = orArgs.concat(typeArray);
    }

    if(orArgs.length){
        filter.$or = orArgs;
    }

    if(keywords){
        const keywordArray = keywords.split(' ').map(word=>(word.toLowerCase()));
        filter.keywords = {
            $all: keywordArray
        }
    }

    if(furnished){
        filter.furnished = furnished == "Yes" ? true: false;
    }

    if(utilities){
        filter.utilities = utilities == "Yes" ? true: false;
    }
    if(parking){
        filter.parking = parking == "Yes" ? true: false;
    }
    if(internet){
        filter.internet = internet == "Yes" ? true: false;
    }
    if(laundry){
        filter.laundry = furnished == "Yes" ? true: false;
    }
    if(ac){
        filter.ac = ac == "Yes" ? true: false;
    }


    if (ownerId) {
        filter.ownerId = convertToObjectId(ownerId)
    }

    aggregationOperator.push({
        $match: {
            $text: {
                $search: location,
                $language: 'english'
            },
            ...filter
        }
    });

    try {
        return await listingsCollection.aggregate(aggregationOperator).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error getting listings for query: ${JSON.stringify(query)}`);
    }
};

export const getListingByIdWithOwnerPopulated = async({
    listingsCollection = required('listingsCollection'),
    id = required('id')
}) => {
    let results;

    try {
        results = await listingsCollection.aggregate([
            {
                $match: {
                    _id: id
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'ownerId',
                    foreignField: '_id',
                    as: 'owners'
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error finding listing for id: ${id}`);
    }

    // Get the single owner out of the owners array and get the single listing from the results
    const [
        listing
    ] = results.map(x => {
        const {
            owners,
            ...rest
        } = x;

        const owner = owners[0];

        return {
            owner,
            ...rest
        };
    });

    if (!listing) {
        throw new Error(`No listing exists for id: ${id}`);
    }

    return listing;
}

export const getUserByEmail = async({
    usersCollection = required('usersCollection'),
    email = required('email')
}) => {
    try {
        return await usersCollection.findOne({
            email,
            isInactive: {
                $ne: true
            }
        });
    } catch (e) {
        throw new RethrownError(e, `Error getting a user with the email ${email}`);
    }
};


export const findUsersByName = async({
    usersCollection = required('usersCollection'),
    name = required('name'),
    type,
    currentUserId,
    excludeSelf
}) => {
    // NOTE: We enclose the name in double quotes because we want it to be treated as a phrase.
    // Typing a first and last name should narrow results, not expand them.
    // Or logic is default for tokens in text search: https://docs.mongodb.com/manual/text-search/
    if (excludeSelf && !currentUserId) {
        throw new Error('You need to pass a currentUserId if you want to exclude the current user ');
    }

    let matchQuery = {
        $text: {
            $search: `"${name}"`,
            $language: 'english'
        }
    };

    if (excludeSelf) {
        matchQuery._id = {
            $ne: currentUserId
        };
    }

    if (type === userTypes.tenant) {
        matchQuery.isLandlord = {
            $ne: true
        };
    } else if (type === userTypes.landlord) {
        matchQuery.isLandlord = true;
    }

    try {
        return await usersCollection.aggregate([
            {
                $match: {
                    ...matchQuery
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error search for users with the name ${name}`);
    }
}

// Makes a verification document and returns a link a user can use to verify their email
export const getEmailConfirmationLink = async({
    user = required('user'),
    verificationsCollection = required('verificationsCollection')
}) => {
    const {
        _id: userId
    } = user;

    const {
        ROOT_URL = required('ROOT_URL'),
        VERIFICATION_TYPES_EMAIL = required('VERIFICATION_TYPES_EMAIL')
    } = process.env;

    const urlIdentifyer = await getUniqueHash(user);

    // Now save the verification document
    try {
        await insertInDb({
            collection: verificationsCollection,
            document: {
                urlIdentifyer,
                userId,
                isCompeted: false,
                type: VERIFICATION_TYPES_EMAIL
            }
        })
    } catch (e) {
        throw new RethrownError(e, `Error creating email verification document for user with id: ${userId}`);
    }

    // Return a link the user can use to confirm their profile
    return `${ROOT_URL}/api/verify/email/${urlIdentifyer}`;
};

export const findVerificationDocument = async({
    verificationsCollection = required('verificationsCollection'),
    urlIdentifyer = required('urlIdentifyer'),
    type = required('type')
}) => {
    try {
        return await verificationsCollection.findOne({
            urlIdentifyer,
            type
        });
    } catch (e) {
        throw new RethrownError(e, `Error finding verification document of type: ${type} with urlIdentifyer: ${urlIdentifyer}`);
    }
};

// Mark a user as inactive if they delete their profile
export const removeUserById = async({
    id = required('id'),
    usersCollection = required('usersCollection')
}) => {
    try {
        return await findAndUpdate({
            collection: usersCollection,
            query: {
                _id: id
            },
            update: {
                isInactive: true
            }
        });
    } catch (e) {
        throw new RethrownError(e, `Error removing user with id ${id}`);
    }
};

// Finds an existing roommate survey response by user id
export const findRoommateSurveyResponse = async({
    roommateSurveysCollection = required('roommateSurveysCollection'),
    userId = required('userId')
}) => {
    try {
        return await roommateSurveysCollection.findOne({
            userId
        });
    } catch (e) {
        throw new RethrownError(e, `Error finding roommateSurveys collection using userId set to: ${userId}`);
    }
};

// Helper for function above that takes the user out of a survey response
function transformRoommateResponseForOutput(response) {
    const {
        user,
        distance,
        ...rest
    } = response;

    return {
        ...user,
        distance
    };
}

// Make a call to the java service to find recommended roommates for a user
export const findRecommendedRoommates = async({
    roommateSurveysCollection = required('roommateSurveysCollection'),
    userSurveyResponse = required('userSurveyResponse')
}) => {
    const {
        maxRecommendedRoommates,
    } = surveyContants;

    const {
        JAVA_FIND_ROOMMATE_URL = required('JAVA_FIND_ROOMMATE_URL')
    } = process.env;

    let result;

    try{
        result = await axios.get(`${JAVA_FIND_ROOMMATE_URL}`, {
            params: {
                userId: String(userSurveyResponse.userId),
                city: userSurveyResponse.city,
                maxResults: maxRecommendedRoommates
            }
        });
    } catch (e) {
        throw new RethrownError(e, 'Error getting roommate matches');
    }

    return result.data;
};

// Returns a user wrapped in an envalope: { user }
export const getUserForPasswordReset = async({
    passwordResetsCollection = required('passwordResetsCollection'),
    urlIdentifyer = required('urlIdentifyer')
}) => {
    const {
        PASSWORD_RESET_DURATION_DAYS = required('PASSWORD_RESET_DURATION_DAYS')
    } = process.env;

    const maxRequestDuration = +PASSWORD_RESET_DURATION_DAYS;
    const maxPossibleDateString = moment().add(maxRequestDuration, 'days').endOf('day').toISOString();

    try {
        return await passwordResetsCollection.aggregate([
            {
                $match: {
                    urlIdentifyer,
                    createdAt: {
                        $lte: new Date(maxPossibleDateString) // Need to pass a Date to mongo (not a moment)
                    },
                    expired: {
                        $ne: true
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $project: {
                    _id: 0,
                    passwordResetId: '$_id',
                    user: { $arrayElemAt: [ '$users', 0 ] }
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RethrownError(`Could not find user for password reset with urlIdentifyer: ${urlIdentifyer}`);
    }
};

// Generates some fake users and some roomate responses. All users are from London.
export const generateRoommateResponses = async({
    usersCollection = required('usersCollection'),
    roommateSurveysCollection = required('roommateSurveysCollection'),
    logger = required('logger', 'You must pass in a logging instance for this module to use')
}) => {
    let usersToMake = 5000;

    while (usersToMake > 0) {
        // Make a fake user
        const name = faker.name.findName();
        const email = faker.internet.email();
        const password = await hashPassword(faker.internet.password());

        let savedUser;

        try {
            savedUser = await insertInDb({
                collection: usersCollection,
                document: {
                    name,
                    email,
                    password,
                    isLandlord: false, // All these fake users are tenants,
                    emailConfirmed: true, // Makes things easier in case we implement email verification checks,
                    profilePictureLink: process.env.DEFAULT_PROFILE_PICTURE_RELATIVE_PATH
                },
                returnInsertedDocument: true
            });
        } catch (e) {
            logger.error(e, `Error saving fake user with email: ${email}`);
        }

        // Now make a fake survey response for this user
        let randomAnswers = {};

        for (let i = 0; i < surveyContants.questions.length; i++) {
            // Random value between 0 and 10
            randomAnswers[`question${i}`] = Math.floor(Math.random() * (10 + 1));
        }

        try {
            await insertInDb({
                collection: roommateSurveysCollection,
                document: {
                    userId: savedUser._id,
                    city: 'London',
                    ...randomAnswers
                }
            });
        } catch (e) {
            logger.error(e, `Error saving roommate survey for user with id: ${savedUser._id}`);
        }

        --usersToMake;
    }
};

export const getUserTimeblocks = async({
    id = required('id'),
    timeblocksCollection = required('timeblocksCollection')
}) => {
    try{
        return await timeblocksCollection.find({ userId: id }).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error finding timeblocks for user with id ${id}`);
    }
}

export const getUserMeetings = async({
    id = required('id'),
    meetingsCollection = required('meetingsCollection')
}) => {
    try{
        return await meetingsCollection.aggregate([
            {
                $match: {
                    participants: {
                        $elemMatch: { id }
                    }
                }
            },
            {
                $lookup: {
                    from: 'listings',
                    localField: 'listing',
                    foreignField: '_id',
                    as: 'listings'
                }
            },
            {
                $project: {
                    participants: 1,
                    start: 1,
                    end: 1,
                    date: 1,
                    owners: 1,
                    listing: { $arrayElemAt: [ '$listings', 0 ] }
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error finding timeblocks for user with id ${id}`);
    }
}

export const getUsersById = async({
    usersCollection = required('usersCollection'),
    ids = required('ids')
}) => {
    try {
        return await usersCollection.find({"_id":{$in:ids}}).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error could not find users by ids: ${ids}`);
    }
};

export const getChannels = async({
    channelsCollection = required('channelsCollection'),
    query
}) => {
    try {
        return await channelsCollection.find(query).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error getting listings for query: ${JSON.stringify(query)}`);
    }
};

export const getMessagesByChannelId = async({
    messagesCollection = required('messagesCollection'),
    query
}) => {
    try {
        return await messagesCollection.find(query).toArray();
    } catch (e) {
        throw new RethrownError(e, `Error getting listings for query: ${JSON.stringify(query)}`);
    }
};

// Makes a password reset document and returns a link a user can use to reset their password
export const getPasswordResetLink = async({
    passwordResetsCollection = required('passwordResetsCollection'),
    user = required('user')
}) => {
    const {
        _id: userId
    } = user;

    const {
        FRONT_END_ROOT = required('FRONT_END_ROOT')
    } = process.env;

    const urlIdentifyer = await getUniqueHash(user);

    try {
        await insertInDb({
            collection: passwordResetsCollection,
            document: {
                userId: userId,
                urlIdentifyer,
                expired: false
            }
        });
    } catch (e) {
        throw new RethrownError(e, `Error inserting password reset document for user with id: ${userId}`);
    }

    // Now make a link to reset the email
    return `${FRONT_END_ROOT}/?passwordResetToken=${urlIdentifyer}`;
};

export const getListingViewers = async({
    viewsCollection = required('viewsCollection'),
    userId,
    listingId
}) => {
    let query = {userId: userId, listingId:listingId}
    try {
        return await viewsCollection.find(query).toArray();
    } catch (e){
        throw new RethrownError(e, `Error finding document with userId: ${userId} and listingId: ${listingId}`);
    }
};

// Returns an object with tenant ids and the keys and the associated listings as the values
export const getLeaseEmailIdentifiersForTenants = ({
    tenantIds = required('tenants'),
    leaseId = required('leaseId')
}) => {
    const {
        ENC_PRIVATE_KEY = required('ENC_PRIVATE_KEY')
    } = process.env;

    return tenantIds.reduce((accumulator, tenantId) => {
        const data = JSON.stringify({
            tenantId,
            leaseId
        });

        let gcm = new GCM(ENC_PRIVATE_KEY);

        return {
            ...accumulator,
            [tenantId]: gcm.encrypt(data)
        };
    }, {});
};

// Takes an encryption and returns the object
export const getLeaseAndTenantFromEncryption = (encryption) => {
    const {
        ENC_PRIVATE_KEY = required('ENC_PRIVATE_KEY')
    } = process.env;

    if (!encryption) {
        return null;
    }

    const gcm = new GCM(ENC_PRIVATE_KEY);

    return JSON.parse(gcm.decrypt(encryption));
}
