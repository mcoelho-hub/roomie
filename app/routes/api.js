import express from 'express';
import { getChildLogger } from '../components/log-factory';
import { required } from '../components/custom-utils';

import listingsRouter from './listings';
import usersRouter from './users';
import verifyRouter from './verify';
import locationsRouter from './locations';

export default ({
    app = required('app'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    const router = express.Router();

    router.use('/listings', listingsRouter({
        db,
        baseLogger
    }));

    router.use('/users', usersRouter({
        db,
        baseLogger
    }));

    router.use('/verify', verifyRouter({
        db,
        baseLogger
    }));

    router.use('/locations', locationsRouter({
        baseLogger
    }));

    // Use the main api router under /api
    app.use('/api', router);
}
