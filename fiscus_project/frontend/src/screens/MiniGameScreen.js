import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const BASKET_WIDTH = 80;
const ITEM_SIZE = 40;
const GAME_DURATION = 30; // seconds

export default function MiniGameScreen({ navigation }) {
    const { updateTickets } = useAuth();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [isPlaying, setIsPlaying] = useState(false);
    const [items, setItems] = useState([]);
    
    const basketX = useRef(new Animated.Value(width / 2 - BASKET_WIDTH / 2)).current;
    const requestRef = useRef();
    const lastSpawnRef = useRef(0);
    const itemsRef = useRef([]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                let newX = gestureState.moveX - BASKET_WIDTH / 2;
                if (newX < 0) newX = 0;
                if (newX > width - BASKET_WIDTH) newX = width - BASKET_WIDTH;
                basketX.setValue(newX);
            },
        })
    ).current;

    const startGame = () => {
        setScore(0);
        setTimeLeft(GAME_DURATION);
        setIsPlaying(true);
        itemsRef.current = [];
        setItems([]);
        lastSpawnRef.current = Date.now();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const gameLoop = () => {
        if (!isPlaying) return;

        const now = Date.now();
        // Spawn item every 800ms
        if (now - lastSpawnRef.current > 800) {
            spawnItem();
            lastSpawnRef.current = now;
        }

        // Update items
        const currentBasketX = basketX.__getValue();
        const yThreshold = height - 120; // approximate basket level
        
        let newItems = [];
        let scoreDelta = 0;

        for (let item of itemsRef.current) {
            item.y += item.speed;
            
            if (item.y > yThreshold && item.y < yThreshold + 40) {
                // Check collision
                if (item.x > currentBasketX - ITEM_SIZE && item.x < currentBasketX + BASKET_WIDTH) {
                    // Caught
                    scoreDelta += item.type === 'good' ? 1 : -10;
                    continue; // remove item
                }
            }

            if (item.y < height) {
                newItems.push(item);
            }
        }

        if (scoreDelta !== 0) {
            setScore(s => s + scoreDelta);
        }

        itemsRef.current = newItems;
        setItems([...newItems]);

        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const spawnItem = () => {
        const isGood = Math.random() > 0.3; // 70% chance of good item
        const xPos = Math.random() * (width - ITEM_SIZE);
        itemsRef.current.push({
            id: Math.random().toString(),
            x: xPos,
            y: -ITEM_SIZE,
            type: isGood ? 'good' : 'bad',
            speed: Math.random() * 3 + 4,
            icon: isGood ? 'nutrition' : 'skull'
        });
    };

    useEffect(() => {
        if (isPlaying) {
            const timer = setInterval(() => {
                setTimeLeft((t) => {
                    if (t <= 1) {
                        endGame();
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isPlaying]);

    const endGame = async () => {
        setIsPlaying(false);
        cancelAnimationFrame(requestRef.current);
        
        const finalScore = score > 0 ? score : 0;
        
        if (finalScore > 0) {
            await updateTickets(finalScore);
        }

        Alert.alert('Гру завершено!', `Ви зібрали ${finalScore} тікетів!`, [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    useEffect(() => {
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    return (
        <View style={s.container}>
            <LinearGradient colors={[COLORS.primaryDark, '#000']} style={StyleSheet.absoluteFillObject} />
            
            {/* Header / Stats */}
            <View style={s.header}>
                <View style={s.statBox}>
                    <Icon name="time-outline" size={20} color="#fff" />
                    <Text style={s.statText}>{timeLeft}с</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
                    <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={[s.statBox, { backgroundColor: score < 0 ? COLORS.error : COLORS.accent }]}>
                    <Icon name="ticket" size={20} color="#fff" />
                    <Text style={[s.statText, {color: '#fff'}]}>{score}</Text>
                </View>
            </View>

            {/* Game Area */}
            {isPlaying ? (
                <View style={s.gameArea}>
                    {items.map(item => (
                        <View key={item.id} style={[s.item, { left: item.x, top: item.y }]}>
                            <Icon name={item.icon} size={32} color={item.type === 'good' ? COLORS.success : COLORS.error} />
                        </View>
                    ))}
                    <Animated.View 
                        style={[s.basket, { transform: [{ translateX: basketX }] }]}
                        {...panResponder.panHandlers}
                    >
                        <Icon name="basket" size={48} color={COLORS.warning} />
                    </Animated.View>
                </View>
            ) : (
                <View style={s.center}>
                    <Icon name="game-controller" size={64} color={COLORS.accent} />
                    <Text style={s.title}>Ловець Тікетів</Text>
                    <Text style={s.desc}>Збирай корисні продукти (+1) і уникай шкідливих (-10). Зароблені бали стануть тікетами!</Text>
                    <TouchableOpacity style={s.startBtn} onPress={startGame}>
                        <Text style={s.startBtnText}>Почати гру</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.xl, paddingTop: SPACING.xxl, zIndex: 10 },
    statBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, gap: 8 },
    statText: { ...FONTS.bold, color: '#fff', fontSize: 18 },
    closeBtn: { padding: 8 },
    
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    title: { ...FONTS.title, color: '#fff', fontSize: 28, marginTop: SPACING.lg },
    desc: { ...FONTS.regular, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginVertical: SPACING.lg },
    startBtn: { backgroundColor: COLORS.accent, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.full },
    startBtnText: { ...FONTS.bold, color: '#fff', fontSize: 18 },

    gameArea: { flex: 1, overflow: 'hidden' },
    item: { position: 'absolute', width: ITEM_SIZE, height: ITEM_SIZE, justifyContent: 'center', alignItems: 'center' },
    basket: { position: 'absolute', bottom: 40, width: BASKET_WIDTH, height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md },
});
