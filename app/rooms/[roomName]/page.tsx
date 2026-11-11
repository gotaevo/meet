import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';
import { isVideoCodec } from '@/lib/types';
import { getLiveKitURL } from '@/lib/getLiveKitURL';
import { getCurrentUser } from '@/lib/auth/session';
import { createInviteCode, isValidInvite } from '@/lib/auth/tokens';
import { InviteRequired } from './InviteRequired';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<{
    // FIXME: We should not allow values for regions if in playground mode.
    region?: string;
    hq?: string;
    codec?: string;
    singlePC?: string;
    convite?: string;
  }>;
}) {
  const _params = await params;
  const _searchParams = await searchParams;
  const roomName = _params.roomName;

  // Team members can open any room; people without an account need this room's invite.
  const session = await getCurrentUser();
  const invite = session
    ? await createInviteCode(roomName)
    : (await isValidInvite(roomName, _searchParams.convite))
      ? _searchParams.convite!
      : null;
  if (!invite) return <InviteRequired roomName={roomName} />;
  const codec =
    typeof _searchParams.codec === 'string' && isVideoCodec(_searchParams.codec)
      ? _searchParams.codec
      : 'vp9';
  const hq = _searchParams.hq === 'true' ? true : false;
  const singlePC = _searchParams.singlePC !== 'false';
  const serverUrl = process.env.LIVEKIT_URL
    ? getLiveKitURL(process.env.LIVEKIT_URL, _searchParams.region ?? null)
    : undefined;

  return (
    <PageClientImpl
      roomName={roomName}
      inviteCode={invite}
      memberName={session?.name}
      serverUrl={serverUrl}
      region={_searchParams.region}
      hq={hq}
      codec={codec}
      singlePeerConnection={singlePC}
    />
  );
}
