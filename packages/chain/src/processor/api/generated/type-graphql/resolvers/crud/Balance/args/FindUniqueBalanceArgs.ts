import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BalanceWhereUniqueInput } from "../../../inputs/BalanceWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class FindUniqueBalanceArgs {
  @TypeGraphQL.Field(_type => BalanceWhereUniqueInput, {
    nullable: false
  })
  where!: BalanceWhereUniqueInput;
}
