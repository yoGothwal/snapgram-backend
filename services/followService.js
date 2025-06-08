const User = require('../models/User');
const Relationship = require('../models/Relationship');

const followService = {
    async followUser(followerId, followingId) {
        // Validate users exist
        const [follower, following] = await Promise.all([
            User.findById(followerId),
            User.findById(followingId)
        ]);

        if (!follower || !following) {
            throw { status: 404, message: "User not found" };
        }

        if (followerId.toString() === followingId.toString()) {
            throw { status: 400, message: "Cannot follow yourself" };
        }

        // Create relationship
        try {
            await Relationship.create({
                follower: followerId,
                following: followingId
            });
        } catch (error) {
            if (error.code === 11000) {
                throw { status: 400, message: "Already following this user" };
            }
            throw error;
        }

        // Update counters
        await Promise.all([
            User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
            User.findByIdAndUpdate(followingId, { $inc: { followerCount: 1 } })
        ]);

        return {
            message: "Followed successfully",
            notification: {
                user: followingId,
                from: followerId,
                message: `${follower.username} started following you`,
                type: "follow"
            }
        };
    },

    async unfollowUser(followerId, followingId) {
        // Validate users exist
        const [follower, following] = await Promise.all([
            User.findById(followerId),
            User.findById(followingId)
        ]);

        if (!follower || !following) {
            throw { status: 404, message: "User not found" };
        }

        if (followerId.toString() === followingId.toString()) {
            throw { status: 400, message: "Cannot unfollow yourself" };
        }

        // Delete relationship
        const result = await Relationship.deleteOne({
            follower: followerId,
            following: followingId
        });

        if (result.deletedCount === 0) {
            throw { status: 400, message: "Not following this user" };
        }

        // Update counters
        await Promise.all([
            User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
            User.findByIdAndUpdate(followingId, { $inc: { followerCount: -1 } })
        ]);

        return {
            message: "Unfollowed successfully",
            notificationDeleted: {
                user: followingId,
                from: followerId,
                type: "follow"
            }
        };
    },

    async getFollowStatus(followerId, followingId) {
        return await Relationship.exists({
            follower: followerId,
            following: followingId
        });
    }
};

module.exports = followService;