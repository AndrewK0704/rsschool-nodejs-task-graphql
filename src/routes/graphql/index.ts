import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import {
  graphql,
  validate,
  parse,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLFloat,
  GraphQLInputObjectType
} from 'graphql';
import depthLimit from 'graphql-depth-limit';
import { UUIDType } from './types/uuid.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

/*1.1 npm run test-queries*/

  const MemberTypeId = new GraphQLEnumType({
    name: 'MemberTypeId',
    values: {
      BASIC: { value: 'BASIC' },
      BUSINESS: { value: 'BUSINESS' },
    },
  });

  const MemberType = new GraphQLObjectType({
    name: 'MemberType',
    fields: () => ({
      id: { type: MemberTypeId },
      discount: { type: GraphQLString},
      postsLimitPerMonth: { type: GraphQLInt },
    }),
  });

  const Post = new GraphQLObjectType({
    name: 'Post',
    fields: () => ({
      id: { type: UUIDType },
      title: { type: GraphQLString },
      content: { type: GraphQLString },
      authorId: { type: new GraphQLNonNull(UUIDType) },
    }),
  });

  const Profile = new GraphQLObjectType({
    name: 'Profile',
    fields: () => ({
      id: { type: UUIDType },
      isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
      yearOfBirth: { type: GraphQLInt },
      userId: { type: new GraphQLNonNull(UUIDType) },
      memberType: {
        type: MemberType,
        resolve: async (profile) => {
          return await prisma.memberType.findUnique({
            where: { id: profile.memberTypeId},
          });
        },
      },
    }),
  });

  const User = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
      id: { type: UUIDType },
      name: { type: GraphQLString },
      balance: { type: GraphQLString },
      profile: {
        type: Profile,
        resolve: async (user) => {
          return await prisma.profile.findUnique({
            where: { userId: user.id },
          });
        },
      },
      posts: {
        type: new GraphQLList(Post),
        resolve: async (user) => {
          return await prisma.post.findMany({
            where: { authorId: user.id },
          });
        },
      },

      userSubscribedTo: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
        resolve: async (user: { id }) => {
            const subscribes = await prisma.subscribersOnAuthors.findMany({
                where: { subscriberId: user.id },
            });

            return Promise.all(
                subscribes.map(({ authorId }) =>
                    prisma.user.findFirst({ where: { id: authorId } }),
                )
            );
        },
      },

      subscribedToUser: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
        resolve: async (user: { id }) => {
            const subscribes = await prisma.subscribersOnAuthors.findMany({
                where: { authorId: user.id },
            });

            return Promise.all(
                subscribes.map(({ subscriberId }) =>
                    prisma.user.findFirst({ where: { id: subscriberId } }),
                )
            );
        },
      },

    }),
  });

  const Query = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      memberTypes: {
        type: new GraphQLList(MemberType),
        resolve: async () => {
          return await prisma.memberType.findMany();
        },
      },
      users: {
        type: new GraphQLList(User),
        resolve: async () => {
          return await prisma.user.findMany();
        },
      },
      posts: {
        type: new GraphQLList(Post),
        resolve: async () => {
          return await prisma.post.findMany();
        },
      },
      profiles: {
        type: new GraphQLList(Profile),
        resolve: async () => {
          return await prisma.profile.findMany();
        },
      },
      memberType: {
        type: MemberType,
        args: { id: { type: new GraphQLNonNull(MemberTypeId) } },
        resolve: async (_source, { id }) => {
          return await prisma.memberType.findUnique({ where: { id } });
        },
      },
      user: {
        type: User,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }) => {
          return await prisma.user.findUnique({ where: { id } });
        },
      },
      post: {
        type: Post,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }) => {
          return await prisma.post.findUnique({ where: { id } });
        },
      },
      profile: {
        type: Profile,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }) => {
          return await prisma.profile.findUnique({ where: { id } });
        },
      },
    }),
  });

/*1.1 npm run test-queries*/

/*1.2 npm run test-mutations*/

    const createInputType = (name: string, fields: Record<string, any>) => {
        return new GraphQLInputObjectType({
            name,
            fields,
        });
    };

    const ChangePostInput = createInputType('ChangePostInput', 
      {
        title: { type: GraphQLString },
        content: { type: GraphQLString },
      }
    );

    const ChangeProfileInput = createInputType('ChangeProfileInput', 
      {
        isMale: { type: GraphQLBoolean },
        yearOfBirth: { type: GraphQLInt },
        memberTypeId: { type: MemberTypeId },
      }
    );

    const ChangeUserInput = createInputType('ChangeUserInput', 
      {
        name: { type: GraphQLString },
        balance: { type: GraphQLFloat },
      }
   );
    
    const CreatePostInput = createInputType('CreatePostInput', 
      {
        title: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      }
    );

    const CreateProfileInput = createInputType('CreateProfileInput', 
      {
        isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
        yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
        memberTypeId: { type: new GraphQLNonNull(MemberTypeId) },
        userId: { type: new GraphQLNonNull(UUIDType) },
      }
    );

    const CreateUserInput = createInputType('CreateUserInput', 
      {
        name: { type: new GraphQLNonNull(GraphQLString) },
        balance: { type: new GraphQLNonNull(GraphQLFloat) },
      }
    );

    const Mutations = new GraphQLObjectType({
      name: 'Mutations',
      fields: {
        createPost: {
            type: new GraphQLNonNull(Post),
            args: {
                dto: { type: new GraphQLNonNull(CreatePostInput) },
            },
            resolve: async (_, { dto }) => {
              return await prisma.post.create({ data: dto });
            },
        },

        createUser: {
            type: new GraphQLNonNull(User),
            args: {
                dto: { type: new GraphQLNonNull(CreateUserInput) },
            },
            resolve: async (_, { dto }) => {
              return await prisma.user.create({ data: dto });  
            },
        },

        createProfile: {
            type: new GraphQLNonNull(Profile),
            args: {
                dto: { type: CreateProfileInput },
            },
            resolve: async (_, { dto }) => {
              return await prisma.profile.create({ data: dto });
            },
        },

        changePost: {
            type: new GraphQLNonNull(Post),
            args: {
                id: { type: new GraphQLNonNull(UUIDType) },
                dto: { type: new GraphQLNonNull(ChangePostInput) },
            },
            resolve: async (_, { id, dto }) => {
              return await prisma.post.update({ where: { id }, data: dto });
            },
        },

        changeProfile: {
            type: new GraphQLNonNull(Profile),
            args: {
                id: { type: new GraphQLNonNull(UUIDType) },
                dto: { type: new GraphQLNonNull(ChangeProfileInput) },
            },
            resolve: async (_, { id, dto }) => {
              return await prisma.profile.update({ where: { id }, data: dto });  
            },
        },

        changeUser: {
            type: new GraphQLNonNull(User),
            args: {
                id: { type: new GraphQLNonNull(UUIDType) },
                dto: { type: new GraphQLNonNull(ChangeUserInput) },
            },
            resolve: async (_, { id, dto }) => {
              return await prisma.user.update({ where: { id }, data: dto });
            },
        },

        deleteUser: {
            type: new GraphQLNonNull(GraphQLString),
            args: {
              id: { type: new GraphQLNonNull(UUIDType) },
            },
            resolve: async (_, { id }) => {
              await prisma.user.delete({ where: { id } });
              return 'User del';
            },
        },

        deletePost: {
            type: new GraphQLNonNull(GraphQLString),
            args: {
                id: { type: new GraphQLNonNull(UUIDType) },
            },
            resolve: async (_, { id }) => {
              await prisma.post.delete({ where: { id } });
              return 'Post del';
            },
        },

        deleteProfile: {
            type: new GraphQLNonNull(GraphQLString),
            args: {
                id: { type: new GraphQLNonNull(UUIDType) },
            },
            resolve: async (_, { id }) => {
              await prisma.profile.delete({ where: { id } });
              return 'Profile del';
            },
        },

        subscribeTo: {
            type: new GraphQLNonNull(GraphQLString),
            args: {
                userId: { type: new GraphQLNonNull(UUIDType) },
                authorId: { type: new GraphQLNonNull(UUIDType) },
            },
            resolve: async (_, { userId, authorId }) => {
              await prisma.subscribersOnAuthors.create({
                  data: { subscriberId: userId, authorId },
              });
              return 'Subscribed';
            },
        },

        unsubscribeFrom: {
            type: new GraphQLNonNull(GraphQLString),
            args: {
                userId: { type: new GraphQLNonNull(UUIDType) },
                authorId: { type: new GraphQLNonNull(UUIDType) },
            },
            resolve: async (_, { userId, authorId }) => {
              await prisma.subscribersOnAuthors.delete({
                  where: {
                      subscriberId_authorId: {
                          subscriberId: userId,
                          authorId,
                      },
                  },
              });
              return 'Unsubscribed';
            },
        },
      },
    });

/*1.2 npm run test-mutations*/

  const schema = new GraphQLSchema({
    query: Query,
    mutation: Mutations,
  });

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      // return graphql();

      const validationErr = validate(schema, parse(req.body.query), [depthLimit(5)]);

      if (validationErr.length) {
        return { errors: validationErr };
      }

      return graphql({
        schema,
        source: req.body.query,
        variableValues: req.body.variables,
      });
    },
  });
};

export default plugin;
