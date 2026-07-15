/**
 * 家庭管理 API
 */
import { CLOUD_FUNCTIONS } from '@/utils/constants';
import { callCloud } from '@/utils/request';
import type { Family, FamilyMember, FamilyRelation, FamilyRole, FamilySettings } from '@/types';

/** 创建家庭 */
export function createFamily(data: { name: string }): Promise<Family> {
  return callCloud<Family>(CLOUD_FUNCTIONS.FAMILY, { action: 'create', data });
}

/** 获取当前用户的家庭信息 */
export function getMyFamily(): Promise<Family | null> {
  return callCloud<Family | null>(CLOUD_FUNCTIONS.FAMILY, { action: 'getMyFamily' });
}

/** 通过邀请码加入家庭 */
export function joinByCode(inviteCode: string, relation: FamilyRelation): Promise<Family> {
  return callCloud<Family>(CLOUD_FUNCTIONS.FAMILY, { action: 'joinByCode', inviteCode, relation });
}

/** 重新生成邀请码 */
export function generateInviteCode(): Promise<{ inviteCode: string }> {
  return callCloud<{ inviteCode: string }>(CLOUD_FUNCTIONS.FAMILY, { action: 'generateInviteCode' });
}

/** 更新成员身份/角色 */
export function updateMember(memberId: string, data: { relation?: FamilyRelation; role?: FamilyRole }): Promise<FamilyMember> {
  return callCloud<FamilyMember>(CLOUD_FUNCTIONS.FAMILY, { action: 'updateMember', memberId, data });
}

/** 移除成员 */
export function removeMember(memberId: string): Promise<void> {
  return callCloud<void>(CLOUD_FUNCTIONS.FAMILY, { action: 'removeMember', memberId });
}

/** 退出家庭 */
export function leaveFamily(): Promise<void> {
  return callCloud<void>(CLOUD_FUNCTIONS.FAMILY, { action: 'leaveFamily' });
}

/** 更新家庭设置 */
export function updateFamilySettings(settings: Partial<FamilySettings>): Promise<FamilySettings> {
  return callCloud<FamilySettings>(CLOUD_FUNCTIONS.FAMILY, { action: 'updateSettings', settings });
}

/** 获取家庭成员列表 */
export function getMembers(): Promise<FamilyMember[]> {
  return callCloud<FamilyMember[]>(CLOUD_FUNCTIONS.FAMILY, { action: 'getMembers' });
}
