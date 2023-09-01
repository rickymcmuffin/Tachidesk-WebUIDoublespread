/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkAdd from '@mui/icons-material/BookmarkAdd';
import BookmarkRemove from '@mui/icons-material/BookmarkRemove';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import Delete from '@mui/icons-material/Delete';
import Done from '@mui/icons-material/Done';
import DoneAll from '@mui/icons-material/DoneAll';
import Download from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RemoveDone from '@mui/icons-material/RemoveDone';
import { CardActionArea, Checkbox, ListItemIcon, ListItemText, Stack } from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IChapter, IDownloadChapter } from '@/typings';
import requestManager from '@/lib/requests/RequestManager.ts';
import { getUploadDateString } from '@/util/date';
import DownloadStateIndicator from '@/components/molecules/DownloadStateIndicator';
import { UpdateChapterPatchInput } from '@/lib/graphql/generated/graphql.ts';

interface IProps {
    chapter: IChapter;
    chapterIds: number[];
    triggerChaptersUpdate: () => void;
    downloadChapter: IDownloadChapter | undefined;
    showChapterNumber: boolean;
    onSelect: (selected: boolean) => void;
    selected: boolean | null;
}

const ChapterCard: React.FC<IProps> = (props: IProps) => {
    const { t } = useTranslation();
    const theme = useTheme();

    const {
        chapter,
        chapterIds,
        triggerChaptersUpdate,
        downloadChapter: dc,
        showChapterNumber,
        onSelect,
        selected,
    } = props;
    const isSelecting = selected !== null;

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        // prevent parent tags from getting the event
        event.stopPropagation();
        event.preventDefault();

        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    type UpdatePatchInput = UpdateChapterPatchInput & { markPrevRead?: boolean };
    const sendChange = <Key extends keyof UpdatePatchInput>(key: Key, value: UpdatePatchInput[Key]) => {
        handleClose();

        if (key === 'markPrevRead') {
            const index = chapterIds.findIndex((chapterId) => chapterId === chapter.id);
            requestManager.updateChapters(chapterIds.slice(index, -1), { isRead: true });
            return;
        }

        requestManager
            .updateChapter(chapter.id, {
                [key]: value,
                lastPageRead: key === 'isRead' ? 0 : undefined,
            })
            .response.then(() => triggerChaptersUpdate());
    };

    const downloadChapter = () => {
        requestManager.addChapterToDownloadQueue(chapter.id);
        handleClose();
    };

    const deleteChapter = () => {
        requestManager.deleteDownloadedChapter(chapter.id).response.then(() => triggerChaptersUpdate());
        handleClose();
    };

    const handleSelect = () => {
        onSelect(true);
        handleClose();
    };

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (isSelecting) {
            event.preventDefault();
            event.stopPropagation();
            onSelect(!selected);
        }
    };

    const isDownloaded = chapter.downloaded;
    const canBeDownloaded = !chapter.downloaded && dc === undefined;

    return (
        <li>
            <Card
                sx={{
                    position: 'relative',
                    margin: 1,
                }}
            >
                <CardActionArea
                    component={Link}
                    to={`/manga/${chapter.mangaId}/chapter/${chapter.index}`}
                    style={{
                        color: theme.palette.text[chapter.read ? 'disabled' : 'primary'],
                    }}
                    onClick={handleClick}
                >
                    <CardContent
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 2,
                            '&:last-child': { pb: 2 },
                        }}
                    >
                        <Stack direction="column" flex={1}>
                            <Typography variant="h5" component="h2">
                                {chapter.bookmarked && (
                                    <BookmarkIcon
                                        color="primary"
                                        sx={{ mr: 0.5, position: 'relative', top: '0.15em' }}
                                    />
                                )}
                                {showChapterNumber ? `${t('chapter.title')} ${chapter.chapterNumber}` : chapter.name}
                            </Typography>
                            <Typography variant="caption">{chapter.scanlator}</Typography>
                            <Typography variant="caption">
                                {getUploadDateString(chapter.uploadDate)}
                                {isDownloaded && ` • ${t('chapter.status.label.downloaded')}`}
                            </Typography>
                        </Stack>

                        {dc && <DownloadStateIndicator download={dc} />}

                        {selected === null ? (
                            <IconButton aria-label="more" onClick={handleMenuClick} size="large">
                                <MoreVertIcon />
                            </IconButton>
                        ) : (
                            <Checkbox checked={selected} />
                        )}
                    </CardContent>
                </CardActionArea>
                <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
                    <MenuItem onClick={handleSelect}>
                        <ListItemIcon>
                            <CheckBoxOutlineBlank fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t('chapter.action.label.select')}</ListItemText>
                    </MenuItem>
                    {isDownloaded && (
                        <MenuItem onClick={deleteChapter}>
                            <ListItemIcon>
                                <Delete fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>{t('chapter.action.download.delete.label.action')}</ListItemText>
                        </MenuItem>
                    )}
                    {canBeDownloaded && (
                        <MenuItem onClick={downloadChapter}>
                            <ListItemIcon>
                                <Download fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>{t('chapter.action.download.add.label.action')}</ListItemText>
                        </MenuItem>
                    )}
                    <MenuItem onClick={() => sendChange('isBookmarked', !chapter.bookmarked)}>
                        <ListItemIcon>
                            {chapter.bookmarked && <BookmarkRemove fontSize="small" />}
                            {!chapter.bookmarked && <BookmarkAdd fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText>
                            {chapter.bookmarked && t('chapter.action.bookmark.remove.label.action')}
                            {!chapter.bookmarked && t('chapter.action.bookmark.add.label.action')}
                        </ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => sendChange('isRead', !chapter.read)}>
                        <ListItemIcon>
                            {chapter.read && <RemoveDone fontSize="small" />}
                            {!chapter.read && <Done fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText>
                            {chapter.read && t('chapter.action.mark_as_read.remove.label.action')}
                            {!chapter.read && t('chapter.action.mark_as_read.add.label.action.current')}
                        </ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => sendChange('markPrevRead', true)}>
                        <ListItemIcon>
                            <DoneAll fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t('chapter.action.mark_as_read.add.label.action.previous')}</ListItemText>
                    </MenuItem>
                </Menu>
            </Card>
        </li>
    );
};

export default ChapterCard;
