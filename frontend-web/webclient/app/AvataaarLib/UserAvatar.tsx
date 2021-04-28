import {Client} from "Authentication/HttpClientInstance";
import {Avatar} from "AvataaarLib";
import {usePromiseKeeper} from "PromiseKeeper";
import * as React from "react";
import Flex from "ui-components/Flex";
import {AvatarType} from "UserSettings/Avataaar";
import {styled} from "@linaria/react";
import {withStyledSystemCompatibility} from "ui-components/Compatibility";

const ClippedBox = withStyledSystemCompatibility([], styled.div`
  display: flex;
  overflow: hidden;
`);

interface UserAvatar {
    avatar: AvatarType;
    width?: string;
}

export const UserAvatar = ({avatar, width = "60px"}: UserAvatar): JSX.Element => (
    <ClippedBox mx="8px" width={width} alignItems="center" height="48px">
        <Avatar avatarStyle="Circle" {...avatar} />
    </ClippedBox>
);

export function ACLAvatars(props: { members: string[] }): JSX.Element | null {
    const [avatars, setAvatars] = React.useState<AvatarType[]>([]);
    const promises = usePromiseKeeper();
    React.useEffect(() => {
        if (props.members.length === 0) return;
        promises.makeCancelable(
            Client.post<{ avatars: { [key: string]: AvatarType } }>("/avatar/bulk", {usernames: props.members})
        ).promise.then(it =>
            setAvatars(Object.values(it.response.avatars))
        ).catch(it => console.warn(it));
    }, [props.members]);
    if (props.members.length === 0) return null;
    return (<Flex><AvatarList avatars={avatars}/></Flex>);
}

function AvatarList(props: { avatars: AvatarType[] }): JSX.Element {
    return (
        <WrapperWrapper>
            {props.avatars.map((a, i) => (
                <Flex
                    height="38px"
                    zIndex={props.avatars.length - i}
                    alignItems="center"
                    key={i}
                >
                    <Avatar avatarStyle="Circle" {...a} />
                </Flex>
            ))}
        </WrapperWrapper>
    );
}

const WrapperWrapper = withStyledSystemCompatibility([], styled.div`
  & > div > svg {
    height: 34px;
    width: 34px;
    margin-right: -17px;
  }

  & > div:last-child > svg {
    margin-right: 0px;
  }
`);
