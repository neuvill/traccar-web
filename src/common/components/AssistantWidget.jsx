import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Fab,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { makeStyles } from 'tss-react/mui';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useTranslation } from './LocalizationProvider';
import {
  buildAiGatewayChatRequest,
  fetchAiGateway,
  fetchAiGatewayAuthContext,
} from '../util/assistantGateway';

const fallbackTranslations = {
  assistantTitle: 'AI Assistant',
  assistantSubtitle: 'Ask about devices, position, distance, and inactivity.',
  assistantWelcome:
    'Ask a fleet question and I will relay it to the AI gateway for a grounded answer.',
  assistantPlaceholder: 'Ask about overspeed, distance, inactivity, or a device position',
  assistantSend: 'Send',
  assistantMinimize: 'Minimize assistant',
  assistantThinking: 'Checking the latest fleet data...',
  assistantErrorGeneric: 'The assistant could not reach the AI gateway.',
  assistantErrorResponse: 'The assistant returned an unexpected response.',
  assistantErrorTryAgain: 'Please try again in a moment.',
  assistantUnsupportedIntent:
    'This assistant currently supports inactive devices, current position, distance summary today, and top overspeed devices today.',
  assistantQuickInactive: 'Inactive devices',
  assistantQuickCurrentPosition: 'Current position',
  assistantQuickDistanceToday: 'Distance summary today',
  assistantQuickOverspeedToday: 'Top overspeed devices today',
};

const createInitialMessages = (translate) => [
  {
    id: 'assistant-welcome',
    role: 'assistant',
    text: translate('assistantWelcome'),
  },
];

const useStyles = makeStyles()((theme) => ({
  fab: {
    position: 'fixed',
    right: theme.spacing(2),
    bottom: theme.spacing(2),
    zIndex: theme.zIndex.drawer + 2,
    boxShadow: `0 16px 32px ${alpha(theme.palette.primary.main, 0.28)}`,
    [theme.breakpoints.down('md')]: {
      left: 'auto',
      right: theme.spacing(2),
      bottom: `calc(${theme.spacing(15)} + env(safe-area-inset-bottom, 0px))`,
      transform: 'none',
    },
  },
  drawerPaper: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: 'none',
    backdropFilter: 'blur(16px)',
  },
  drawerPaperDesktop: {
    width: 'min(420px, calc(100vw - 32px))',
    height: 'min(640px, calc(100vh - 32px))',
    top: 'auto',
    right: theme.spacing(2),
    bottom: theme.spacing(2),
    left: 'auto',
    borderRadius: theme.spacing(3),
    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    boxShadow: `0 24px 60px ${alpha(theme.palette.common.black, 0.22)}`,
  },
  drawerPaperMobile: {
    height: 'min(78vh, 640px)',
    borderTopLeftRadius: theme.spacing(3),
    borderTopRightRadius: theme.spacing(3),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2, 2, 1.5),
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.background.paper, 0.96)})`,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    minWidth: 0,
  },
  iconWrap: {
    width: 42,
    height: 42,
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    color: theme.palette.primary.contrastText,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    flexShrink: 0,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(1.5, 2),
    backgroundColor: alpha(theme.palette.background.default, 0.72),
  },
  footer: {
    padding: theme.spacing(1.5, 2, 2),
    backgroundColor: theme.palette.background.paper,
  },
  quickPrompts: {
    marginBottom: theme.spacing(2),
  },
}));

const extractGatewayMessage = (payload) => {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  return (
    payload.reply || payload.message || payload.response || payload.answer || payload.text || ''
  );
};

const extractGatewayError = (payload) => {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  return payload.error || payload.message || payload.detail || payload.title || '';
};

const extractGatewayErrorCode = (payload) => {
  if (!payload || typeof payload === 'string') {
    return '';
  }
  return payload.error || payload.code || '';
};

const AssistantWidget = ({ renderTrigger = null }) => {
  const { classes, cx } = useStyles();
  const theme = useTheme();
  const t = useTranslation();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));

  const translate = (key) => t(key) || fallbackTranslations[key] || key;

  const inputRef = useRef(null);
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const sequenceRef = useRef(1);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(() => createInitialMessages(translate));

  const quickPrompts = [
    {
      id: 'inactive',
      label: translate('assistantQuickInactive'),
      mode: 'send',
      message: 'inactive devices',
    },
    {
      id: 'position',
      label: translate('assistantQuickCurrentPosition'),
      mode: 'prefill',
      message: 'current position of ',
    },
    {
      id: 'distance',
      label: translate('assistantQuickDistanceToday'),
      mode: 'send',
      message: 'distance summary today',
    },
    {
      id: 'overspeed',
      label: translate('assistantQuickOverspeedToday'),
      mode: 'send',
      message: 'top 5 overspeed devices today',
    },
  ];

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const appendMessage = (role, text) => {
    setMessages((previous) => [
      ...previous,
      {
        id: `assistant-message-${(sequenceRef.current += 1)}`,
        role,
        text,
      },
    ]);
  };

  const sendMessage = async (rawMessage = inputValue) => {
    const message = rawMessage.trim();
    if (!message || loading) {
      return;
    }

    setOpen(true);
    setError('');
    setInputValue('');
    appendMessage('user', message);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (import.meta.env.DEV) {
        try {
          const authContext = await fetchAiGatewayAuthContext(controller.signal);
          console.log('AI gateway auth context:', authContext);
        } catch (contextError) {
          console.warn('AI gateway auth context check failed:', contextError);
        }
      }

      const response = await fetchAiGateway('/chat', {
        ...buildAiGatewayChatRequest({ message }),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await response.json() : await response.text();

      console.log('AI gateway response:', {
        status: response.status,
        ok: response.ok,
        payload,
      });

      if (!response.ok) {
        const errorCode = extractGatewayErrorCode(payload);
        if (errorCode === 'unsupported_intent') {
          appendMessage(
            'assistant',
            `${translate('assistantUnsupportedIntent')} Try: "inactive devices", "current position of 62", "distance summary today", or "top 5 overspeed devices today".`,
          );
          return;
        }
        throw new Error(extractGatewayError(payload) || translate('assistantErrorGeneric'));
      }

      const reply = extractGatewayMessage(payload);
      if (!reply) {
        throw new Error(translate('assistantErrorResponse'));
      }

      appendMessage('assistant', reply);
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        return;
      }
      setError(fetchError.message || translate('assistantErrorGeneric'));
      appendMessage(
        'assistant',
        `${translate('assistantErrorGeneric')} ${translate('assistantErrorTryAgain')}`,
      );
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setOpen(true);
    setError('');

    if (prompt.mode === 'prefill') {
      setInputValue(prompt.message);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    void sendMessage(prompt.message);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const drawerPaperClassName = cx(
    classes.drawerPaper,
    mobile ? classes.drawerPaperMobile : classes.drawerPaperDesktop,
  );

  const trigger = renderTrigger
    ? renderTrigger({
        open,
        onOpen: () => setOpen(true),
        title: translate('assistantTitle'),
      })
    : !open && (
        <Tooltip title={translate('assistantTitle')}>
          <Fab
            color="primary"
            aria-label={translate('assistantTitle')}
            className={classes.fab}
            onClick={() => setOpen(true)}
          >
            <SmartToyOutlinedIcon />
          </Fab>
        </Tooltip>
      );

  return (
    <>
      {trigger}
      <Drawer
        anchor={mobile ? 'bottom' : 'right'}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ className: drawerPaperClassName }}
      >
        <div className={classes.header}>
          <div className={classes.headerTitle}>
            <div className={classes.iconWrap}>
              <AutoAwesomeRoundedIcon fontSize="small" />
            </div>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {translate('assistantTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {translate('assistantSubtitle')}
              </Typography>
            </Box>
          </div>
          <Tooltip title={translate('assistantMinimize')}>
            <IconButton onClick={() => setOpen(false)} size="small">
              <RemoveRoundedIcon />
            </IconButton>
          </Tooltip>
        </div>
        <Divider />
        <div className={classes.body}>
          <div className={classes.messages}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {messages.length <= 1 && (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                className={classes.quickPrompts}
              >
                {quickPrompts.map((prompt) => (
                  <Chip
                    key={prompt.id}
                    label={prompt.label}
                    clickable
                    disabled={loading}
                    onClick={() => handleQuickPrompt(prompt)}
                    sx={{ borderRadius: 2 }}
                  />
                ))}
              </Stack>
            )}
            <Stack spacing={1.5}>
              {messages.map((message) => {
                const assistantMessage = message.role === 'assistant';
                return (
                  <Box
                    key={message.id}
                    sx={{
                      alignSelf: assistantMessage ? 'flex-start' : 'flex-end',
                      maxWidth: '88%',
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2.5,
                      whiteSpace: 'pre-wrap',
                      backgroundColor: assistantMessage
                        ? alpha(theme.palette.primary.main, 0.08)
                        : theme.palette.primary.main,
                      color: assistantMessage
                        ? theme.palette.text.primary
                        : theme.palette.primary.contrastText,
                      boxShadow: assistantMessage
                        ? 'none'
                        : `0 10px 24px ${alpha(theme.palette.primary.main, 0.24)}`,
                    }}
                  >
                    <Typography variant="body2">{message.text}</Typography>
                  </Box>
                );
              })}
              {loading && (
                <Box
                  sx={{
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    maxWidth: '88%',
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 2.5,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  }}
                >
                  <CircularProgress size={16} />
                  <Typography variant="body2">{translate('assistantThinking')}</Typography>
                </Box>
              )}
            </Stack>
            <div ref={endRef} />
          </div>
          <Divider />
          <div className={classes.footer}>
            <Stack spacing={1.5}>
              <TextField
                inputRef={inputRef}
                multiline
                minRows={2}
                maxRows={4}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={translate('assistantPlaceholder')}
                disabled={loading}
                fullWidth
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  endIcon={<SendRoundedIcon />}
                  onClick={() => void sendMessage()}
                  disabled={!inputValue.trim() || loading}
                >
                  {translate('assistantSend')}
                </Button>
              </Box>
            </Stack>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default AssistantWidget;
