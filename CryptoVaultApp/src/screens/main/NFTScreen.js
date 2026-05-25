// src/screens/main/NFTScreen.js

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  RefreshControl,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native'

import axios from 'axios'
import { Video } from 'expo-av'
import { LinearGradient } from 'expo-linear-gradient'

import { useTheme } from '../../context/ThemeContext'
import { useApp } from '../../context/AppContext'
import { getNetwork } from '../../utils/networks'
import { SPACING } from '../../utils/theme'
import { Spinner, Alert } from '../../components/UI'

const { width } = Dimensions.get('window')

const COL_WIDTH =
  (width - SPACING.lg * 2 - 12) / 2

// ─────────────────────────────────────────────
// IPFS NORMALIZER
// ─────────────────────────────────────────────

const normalizeIPFS = (url) => {
  if (!url) return null

  if (url.startsWith('ipfs://')) {
    return url.replace(
      'ipfs://',
      'https://ipfs.io/ipfs/'
    )
  }

  if (url.includes('gateway.pinata.cloud')) {
    return url.replace(
      'https://gateway.pinata.cloud/ipfs/',
      'https://ipfs.io/ipfs/'
    )
  }

  return url
}

// ─────────────────────────────────────────────
// DETECT VIDEO NFT
// ─────────────────────────────────────────────

const isVideoNFT = (
  animation,
  attributes = []
) => {
  return attributes.some(
    (a) =>
      String(a.value).toLowerCase() ===
      'video'
  )
}

// ─────────────────────────────────────────────
// FETCH NFTS
// ─────────────────────────────────────────────

const fetchNFTs = async (
  address,
  networkId
) => {
  const key = process.env.EXPO_PUBLIC_ALCHEMY_KEY

  if (!key) return []

  const chainMap = {
    eth_mainnet: 'eth-mainnet',
    polygon_mainnet: 'polygon-mainnet',
    eth_sepolia: 'eth-sepolia',
  }

  const chain = chainMap[networkId]

  if (!chain) return []

  try {
    const { data } = await axios.get(
      `https://${chain}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`,
      {
        params: {
          owner: address,
          withMetadata: true,
          pageSize: 50,
        },
      }
    )

    return (data.ownedNfts || []).map((n) => {
      const metadata = n.raw?.metadata || {}

      const image = normalizeIPFS(
        n.image?.cachedUrl ||
          n.image?.originalUrl ||
          metadata.image
      )

      const animation = normalizeIPFS(
        metadata.animation_url ||
          n.animation?.cachedUrl ||
          n.animation?.originalUrl
      )

      return {
        id: `${n.contract.address}-${n.tokenId}`,

        name:
          n.name ||
          metadata.name ||
          `#${n.tokenId}`,

        collection:
          n.contract.name ||
          'Unknown Collection',

        image,
        animation,

        isVideo: isVideoNFT(
          animation,
          metadata.attributes || []
        ),

        tokenId: n.tokenId,

        contract: n.contract.address,

        description:
          metadata.description ||
          n.description,

        attributes:
          metadata.attributes || [],
      }
    })
  } catch (err) {
    console.log(err)
    return []
  }
}

// ─────────────────────────────────────────────
// NFT CARD
// ─────────────────────────────────────────────

const NFTCard = ({
  nft,
  onPress,
  colors,
}) => {
  const scale = useRef(
    new Animated.Value(1)
  ).current

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: 0.96,
          useNativeDriver: true,
        }).start()
      }}
      onPressOut={() => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start()
      }}
    >
      <Animated.View
        style={{
          width: COL_WIDTH,
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          transform: [{ scale }],
          marginBottom: 12,
        }}
      >

        {/* NFT MEDIA */}
        <View
          style={{
            width: '100%',
            height: COL_WIDTH,
            backgroundColor:
              colors.surface2,
          }}
        >
          {nft.isVideo &&
          nft.animation ? (
            <Video
              source={{
                uri: nft.animation,
              }}
              style={{
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
              shouldPlay
              isLooping
              isMuted
              useNativeControls={false}
            />
          ) : nft.image ? (
            <Image
              source={{
                uri: nft.image,
              }}
              style={{
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={
                colors.isDark
                  ? ['#1e1e1e', '#2e2e2e']
                  : ['#7F5AF0', '#2CB67D']
              }
              style={{
                flex: 1,
                justifyContent:
                  'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 50,
                }}
              >
                ✨
              </Text>
            </LinearGradient>
          )}

          {/* VIDEO BADGE */}
          {nft.isVideo && (
            <View
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                backgroundColor:
                  'rgba(0,0,0,0.7)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: '800',
                }}
              >
                VIDEO NFT
              </Text>
            </View>
          )}

          {/* TOKEN BADGE */}
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor:
                'rgba(0,0,0,0.7)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 10,
                fontWeight: '800',
              }}
            >
              #{nft.tokenId}
            </Text>
          </View>
        </View>

        {/* INFO */}
        <View
          style={{
            padding: 12,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: colors.text,
              fontSize: 15,
              fontWeight: '800',
            }}
          >
            {nft.name}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              color: colors.accent,
              marginTop: 4,
              fontSize: 12,
            }}
          >
            {nft.collection}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────
// NFT DETAIL MODAL
// ─────────────────────────────────────────────

const NFTDetailModal = ({
  nft,
  visible,
  onClose,
  colors,
}) => {
  if (!nft) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
    >
      <View
        style={{
          flex: 1,
          backgroundColor:
            'rgba(0,0,0,0.9)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor:
              colors.surface,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            maxHeight: '92%',
            overflow: 'hidden',
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
          >

            {/* NFT MEDIA */}
            <View
              style={{
                width: '100%',
                height: 380,
                backgroundColor:
                  colors.surface2,
              }}
            >
              {nft.isVideo &&
              nft.animation ? (
                <Video
                  source={{
                    uri: nft.animation,
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="cover"
                  shouldPlay
                  useNativeControls
                  isLooping
                />
              ) : nft.image ? (
                <Image
                  source={{
                    uri: nft.image,
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={
                    colors.isDark
                      ? ['#1e1e1e', '#2e2e2e']
                      : ['#7F5AF0', '#2CB67D']
                  }
                  style={{
                    flex: 1,
                    justifyContent:
                      'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 70,
                    }}
                  >
                    ✨
                  </Text>
                </LinearGradient>
              )}
            </View>

            {/* CONTENT */}
            <View
              style={{
                padding: 20,
              }}
            >
              {/* COLLECTION */}
              <View
                style={{
                  alignSelf:
                    'flex-start',
                  backgroundColor: `${colors.accent}15`,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    color:
                      colors.accent,
                    fontWeight: '700',
                  }}
                >
                  {nft.collection}
                </Text>
              </View>

              {/* NAME */}
              <Text
                style={{
                  color: colors.text,
                  fontSize: 30,
                  fontWeight: '900',
                }}
              >
                {nft.name}
              </Text>

              {/* DESCRIPTION */}
              {!!nft.description && (
                <Text
                  style={{
                    color:
                      colors.textSub,
                    marginTop: 12,
                    lineHeight: 22,
                    fontSize: 14,
                  }}
                >
                  {nft.description}
                </Text>
              )}

              {/* DETAILS */}
              <View
                style={{
                  marginTop: 25,
                  borderTopWidth: 1,
                  borderTopColor:
                    colors.border,
                  paddingTop: 20,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '800',
                    marginBottom: 15,
                  }}
                >
                  NFT Details
                </Text>

                {/* TOKEN ID */}
                <View
                  style={{
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      color:
                        colors.textSub,
                    }}
                  >
                    Token ID
                  </Text>

                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: '700',
                      marginTop: 4,
                    }}
                  >
                    #{nft.tokenId}
                  </Text>
                </View>

                {/* CONTRACT */}
                <View
                  style={{
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      color:
                        colors.textSub,
                    }}
                  >
                    Contract
                  </Text>

                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: '700',
                      marginTop: 4,
                    }}
                  >
                    {nft.contract}
                  </Text>
                </View>

                {/* ATTRIBUTES */}
                {nft.attributes?.length >
                  0 && (
                  <>
                    <Text
                      style={{
                        color:
                          colors.text,
                        fontSize: 18,
                        fontWeight:
                          '800',
                        marginTop: 15,
                        marginBottom: 15,
                      }}
                    >
                      Attributes
                    </Text>

                    <View
                      style={{
                        flexDirection:
                          'row',
                        flexWrap: 'wrap',
                      }}
                    >
                      {nft.attributes.map(
                        (
                          attr,
                          index
                        ) => (
                          <View
                            key={index}
                            style={{
                              backgroundColor:
                                colors.surface2,
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderRadius: 15,
                              marginRight: 10,
                              marginBottom: 10,
                              minWidth: 120,
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  colors.textSub,
                                fontSize: 11,
                              }}
                            >
                              {
                                attr.trait_type
                              }
                            </Text>

                            <Text
                              style={{
                                color:
                                  colors.text,
                                fontWeight:
                                  '800',
                                marginTop: 5,
                              }}
                            >
                              {String(
                                attr.value
                              )}
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                  </>
                )}
              </View>
            </View>
          </ScrollView>

          {/* CLOSE BUTTON */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              margin: 20,
              backgroundColor:
                colors.accent,
              paddingVertical: 16,
              borderRadius: 18,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontWeight: '800',
                fontSize: 15,
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────

export default function NFTScreen() {
  const { activeWallet, activeNetwork } =
    useApp()

  const { colors } = useTheme()

  const network =
    getNetwork(activeNetwork)

  const [nfts, setNfts] = useState([])
  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [selectedNFT, setSelectedNFT] =
    useState(null)

  const [error, setError] =
    useState('')

  const load = useCallback(async () => {
    if (!activeWallet) return

    try {
      setError('')

      const data = await fetchNFTs(
        activeWallet.address,
        activeNetwork
      )

      setNfts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeWallet, activeNetwork])

  useEffect(() => {
    load()
  }, [load])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
      }}
    >
      <StatusBar
        barStyle={
          colors.isDark
            ? 'light-content'
            : 'dark-content'
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: SPACING.lg,
          paddingBottom: 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              load()
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: '900',
            color: colors.text,
          }}
        >
          My NFTs
        </Text>

        <Text
          style={{
            color: colors.textSub,
            marginTop: 6,
            marginBottom: 24,
          }}
        >
          {nfts.length} collectibles
          on {network?.name}
        </Text>

        {/* ERROR */}
        {!!error && (
          <Alert type="warning">
            {error}
          </Alert>
        )}

        {/* LOADING */}
        {loading ? (
          <View
            style={{
              paddingVertical: 100,
              alignItems: 'center',
            }}
          >
            <Spinner size="large" />

            <Text
              style={{
                marginTop: 14,
                color: colors.textSub,
              }}
            >
              Loading NFTs...
            </Text>
          </View>
        ) : nfts.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              paddingTop: 80,
            }}
          >
            <Text
              style={{
                fontSize: 70,
              }}
            >
              🪙
            </Text>

            <Text
              style={{
                marginTop: 20,
                color: colors.text,
                fontSize: 22,
                fontWeight: '800',
              }}
            >
              No NFTs Found
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent:
                'space-between',
            }}
          >
            {nfts.map((nft) => (
              <NFTCard
                key={nft.id}
                nft={nft}
                colors={colors}
                onPress={() =>
                  setSelectedNFT(nft)
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* DETAIL MODAL */}
      <NFTDetailModal
        nft={selectedNFT}
        visible={!!selectedNFT}
        onClose={() =>
          setSelectedNFT(null)
        }
        colors={colors}
      />
    </View>
  )
}