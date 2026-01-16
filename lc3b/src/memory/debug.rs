#[allow(dead_code)]
pub fn dump_words_to_binary(words: &[u16]) -> String {
    let mut string = String::with_capacity(words.len() * 17); // 16 bits + newline

    for word in words.iter() {
        string += &format!("{:016b}\n", word);
    }

    string
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_dump_words() {
        let data = [0xDEAD, 0xBEEF];

        let expected = "1101111010101101\n1011111011101111\n";
        let dumped = super::dump_words_to_binary(&data[..]);

        assert_eq!(expected, dumped);
    }
}
