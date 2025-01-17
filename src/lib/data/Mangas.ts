/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { t as translate } from 'i18next';
import { TManga, TranslationKey } from '@/typings.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import {
    ChapterConditionInput,
    GetMangasChapterIdsWithStateQuery,
    UpdateMangaCategoriesPatchInput,
} from '@/lib/graphql/generated/graphql.ts';
import { Chapters } from '@/lib/data/Chapters.ts';
import { makeToast } from '@/components/util/Toast.tsx';

export type MangaAction =
    | 'download'
    | 'delete'
    | 'mark_as_read'
    | 'mark_as_unread'
    | 'remove_from_library'
    | 'change_categories';

export const actionToTranslationKey: {
    [key in MangaAction]: {
        action: {
            single: TranslationKey;
            selected: TranslationKey;
        };
        success: TranslationKey;
        error: TranslationKey;
    };
} = {
    download: {
        action: {
            single: 'chapter.action.download.add.label.action',
            selected: 'chapter.action.download.add.button.selected',
        },
        success: 'chapter.action.download.add.label.success',
        error: 'chapter.action.download.add.label.error',
    },
    delete: {
        action: {
            single: 'chapter.action.download.delete.label.action',
            selected: 'chapter.action.download.delete.button.selected',
        },
        success: 'chapter.action.download.delete.label.success',
        error: 'chapter.action.download.delete.label.error',
    },
    mark_as_read: {
        action: {
            single: 'chapter.action.mark_as_read.add.label.action.current',
            selected: 'chapter.action.mark_as_read.add.button.selected',
        },
        success: 'chapter.action.mark_as_read.add.label.success',
        error: 'chapter.action.mark_as_read.add.label.error',
    },
    mark_as_unread: {
        action: {
            single: 'chapter.action.mark_as_read.remove.label.action',
            selected: 'chapter.action.mark_as_read.remove.button.selected',
        },
        success: 'chapter.action.mark_as_read.remove.label.success',
        error: 'chapter.action.mark_as_read.remove.label.error',
    },
    remove_from_library: {
        action: {
            single: 'manga.action.library.remove.label.action',
            selected: 'manga.action.library.remove.button.selected',
        },
        success: 'manga.action.library.remove.label.success',
        error: 'manga.action.library.remove.label.error',
    },
    change_categories: {
        action: {
            single: 'manga.action.category.label.action',
            selected: 'manga.action.category.button.selected',
        },
        success: 'manga.action.category.label.success',
        error: 'manga.action.category.label.error',
    },
};

export type MangaChapterCountInfo = { chapters: Pick<TManga['chapters'], 'totalCount'> };
export type MangaDownloadInfo = Pick<TManga, 'downloadCount'> & MangaChapterCountInfo;
export type MangaUnreadInfo = Pick<TManga, 'unreadCount'> & MangaChapterCountInfo;
export class Mangas {
    static getIds(mangas: { id: number }[]): number[] {
        return mangas.map((manga) => manga.id);
    }

    static isNotDownloaded({ downloadCount }: MangaDownloadInfo): boolean {
        return downloadCount === 0;
    }

    static getNotDownloaded<Mangas extends MangaDownloadInfo>(mangas: Mangas[]): Mangas[] {
        return mangas.filter(Mangas.isNotDownloaded);
    }

    static isFullyDownloaded({ downloadCount, chapters: { totalCount } }: MangaDownloadInfo): boolean {
        return downloadCount === totalCount;
    }

    static getFullyDownloaded<Mangas extends MangaDownloadInfo>(mangas: Mangas[]): Mangas[] {
        return mangas.filter(Mangas.isFullyDownloaded);
    }

    static isPartiallyDownloaded(manga: MangaDownloadInfo): boolean {
        return !Mangas.isNotDownloaded(manga) && !Mangas.isFullyDownloaded(manga);
    }

    static getPartiallyDownloaded<Mangas extends MangaDownloadInfo>(mangas: Mangas[]): Mangas[] {
        return mangas.filter(Mangas.isPartiallyDownloaded);
    }

    static isUnread({ unreadCount, chapters: { totalCount } }: MangaUnreadInfo): boolean {
        return unreadCount === totalCount;
    }

    static getUnread<Mangas extends MangaUnreadInfo>(mangas: Mangas[]): Mangas[] {
        return mangas.filter(Mangas.isUnread);
    }

    static isFullyRead({ unreadCount }: MangaUnreadInfo): boolean {
        return unreadCount === 0;
    }

    static getFullyRead<Mangas extends MangaUnreadInfo>(mangas: Mangas[]): Mangas[] {
        return mangas.filter(Mangas.isFullyRead);
    }

    static isPartiallyRead(manga: MangaUnreadInfo): boolean {
        return !Mangas.isUnread(manga) && !Mangas.isFullyRead(manga);
    }

    static getPartiallyRead<Mangas extends MangaUnreadInfo>(mangas: Mangas[]): Mangas[] {
        return mangas.filter(Mangas.isPartiallyRead);
    }

    static async getChapterIdsWithState(
        mangaIds: number[],
        state: Pick<ChapterConditionInput, 'isRead' | 'isDownloaded' | 'isBookmarked'>,
    ): Promise<GetMangasChapterIdsWithStateQuery['chapters']['nodes']> {
        const { data } = await requestManager.getMangasChapterIdsWithState(mangaIds, state).response;
        return data.chapters.nodes;
    }

    static async downloadChapters(mangaIds: number[]): Promise<void> {
        const chapters = await Mangas.getChapterIdsWithState(mangaIds, { isDownloaded: false });
        return Chapters.download(Chapters.getIds(chapters));
    }

    static async deleteChapters(mangaIds: number[]): Promise<void> {
        const chapters = await Mangas.getChapterIdsWithState(mangaIds, { isDownloaded: true });
        return Chapters.delete(Chapters.getIds(chapters));
    }

    static async markAsRead(mangaIds: number[], wasManuallyMarkedAsRead: boolean = false): Promise<void> {
        const chapters = await Mangas.getChapterIdsWithState(mangaIds, { isRead: false });
        return Chapters.markAsRead(chapters, wasManuallyMarkedAsRead);
    }

    static async markAsUnread(mangaIds: number[]): Promise<void> {
        const chapters = await Mangas.getChapterIdsWithState(mangaIds, { isRead: true });
        return Chapters.markAsUnread(Chapters.getIds(chapters));
    }

    static async removeFromLibrary(mangaIds: number[]): Promise<void> {
        return Mangas.executeAction(
            'remove_from_library',
            mangaIds.length,
            () => requestManager.updateMangas(mangaIds, { inLibrary: false }).response,
        );
    }

    static async changeCategories(mangaIds: number[], patch: UpdateMangaCategoriesPatchInput): Promise<void> {
        return Mangas.executeAction(
            'change_categories',
            mangaIds.length,
            () => requestManager.updateMangasCategories(mangaIds, patch).response,
        );
    }

    private static async executeAction(
        action: MangaAction,
        itemCount: number,
        fnToExecute: () => Promise<unknown>,
    ): Promise<void> {
        try {
            await fnToExecute();
            makeToast(translate(actionToTranslationKey[action].success, { count: itemCount }), 'success');
        } catch (e) {
            makeToast(translate(actionToTranslationKey[action].error, { count: itemCount }), 'error');
            throw e;
        }
    }

    static async performAction<Action extends MangaAction>(
        action: Action,
        mangaIds: number[],
        {
            wasManuallyMarkedAsRead,
            changeCategoriesPatch,
        }: Action extends 'mark_as_read'
            ? { wasManuallyMarkedAsRead: boolean; changeCategoriesPatch?: never }
            : Action extends 'change_categories'
              ? { wasManuallyMarkedAsRead?: never; changeCategoriesPatch: UpdateMangaCategoriesPatchInput }
              : { wasManuallyMarkedAsRead?: boolean; changeCategoriesPatch?: UpdateMangaCategoriesPatchInput },
    ): Promise<void> {
        switch (action) {
            case 'download':
                return Mangas.downloadChapters(mangaIds);
            case 'delete':
                return Mangas.deleteChapters(mangaIds);
            case 'mark_as_read':
                return Mangas.markAsRead(mangaIds, wasManuallyMarkedAsRead!);
            case 'mark_as_unread':
                return Mangas.markAsUnread(mangaIds);
            case 'remove_from_library':
                return Mangas.removeFromLibrary(mangaIds);
            case 'change_categories':
                return Mangas.changeCategories(mangaIds, changeCategoriesPatch!);
            default:
                throw new Error(`Mangas::performAction: unknown action "${action}"`);
        }
    }
}
